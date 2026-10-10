"""Refresh the public SCDS catalogue from NTU Class Schedule (no login required)."""
import argparse
import hashlib
import json
import re
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'https://wish.wis.ntu.edu.sg/webexe/owa/AUS_SCHEDULE.main_display1'
SOURCE_PAGE = 'https://wish.wis.ntu.edu.sg/webexe/owa/aus_schedule.main'
DAYS = {'MON': 0, 'TUE': 1, 'WED': 2, 'THU': 3, 'FRI': 4, 'SAT': 5, 'SUN': 6}

def parse_weeks(remark):
    match = re.search(r'Teaching\s+Wk\s*([\d,\-\s]+)', remark, re.I)
    if not match:
        if re.search(r'Wk|week', remark, re.I):
            raise ValueError(f'Unrecognized week notation: {remark}')
        return None
    weeks = set()
    for token in match[1].strip().replace(' ', '').split(','):
        if not token:
            continue
        parts = token.split('-')
        if len(parts) == 1:
            weeks.add(int(parts[0]))
        elif len(parts) == 2 and int(parts[0]) <= int(parts[1]):
            weeks.update(range(int(parts[0]), int(parts[1]) + 1))
        else:
            raise ValueError(f'Invalid week range: {token}')
    if not weeks or min(weeks) < 1 or max(weeks) > 13:
        raise ValueError(f'Unsupported teaching weeks: {remark}')
    return sorted(weeks)

def parse_time(value):
    match = re.fullmatch(r'(\d{2})(\d{2})-(\d{2})(\d{2})', value)
    if not match:
        raise ValueError(f'Unscheduled or unsupported time: {value}')
    h1, m1, h2, m2 = map(int, match.groups())
    if not (0 <= h1 <= 23 and 0 <= h2 <= 23 and 0 <= m1 < 60 and 0 <= m2 < 60):
        raise ValueError(f'Invalid time: {value}')
    start, end = h1 * 60 + m1, h2 * 60 + m2
    if end <= start:
        raise ValueError(f'Invalid time range: {value}')
    return start, end

def parse_schedule(html, programme):
    soup = BeautifulSoup(html, 'html.parser')
    if 'Class schedule is not available.' in soup.get_text():
        raise ValueError(f'No official schedule for {programme}')
    courses, excluded = [], []
    for table in soup.find_all('table'):
        rows = table.find_all('tr', recursive=False)
        if not rows:
            rows = table.find_all('tr')
        if not rows:
            continue
        header = rows[0].find_all('td', recursive=False)
        if len(header) != 3:
            continue
        code, title, au_text = [c.get_text(' ', strip=True) for c in header]
        if not re.fullmatch(r'[A-Z]{2,4}\d{4}', code):
            continue
        au_match = re.search(r'(\d*\.\d+|\d+)\s*AU', au_text)
        if not au_match:
            raise ValueError(f'Missing AU for {code}')
        next_table = table.find_next_sibling('table')
        if next_table is None:
            raise ValueError(f'Missing index table for {code}')
        indexes = {}
        invalid = {}
        current = None
        for row in next_table.find_all('tr'):
            cells = row.find_all('td', recursive=False)
            if not cells:
                continue
            if len(cells) != 7:
                raise ValueError(f'Unexpected {code} row shape: {len(cells)} cells')
            index, kind, group, day, duration, venue, remark = [c.get_text(' ', strip=True) for c in cells]
            if index:
                if not re.fullmatch(r'\d{5}', index):
                    raise ValueError(f'Invalid official index: {index}')
                current = index
                indexes.setdefault(index, [])
            if current is None:
                raise ValueError(f'Orphan continuation row for {code}')
            try:
                if day not in DAYS:
                    raise ValueError(f'Unsupported or unspecified day: {day or "blank"}')
                start, end = parse_time(duration)
                weeks = parse_weeks(remark)
                session = dict(day=DAYS[day], start=start, end=end, type=kind, group=group, venue=venue, remark=remark)
                if weeks is not None:
                    session['weeks'] = weeks
                indexes[current].append(session)
            except ValueError as error:
                invalid[current] = str(error)
        for index, reason in invalid.items():
            excluded.append(dict(code=code, index=index, programme=programme, reason=reason))
        valid = [dict(id=index, sessions=sessions) for index, sessions in indexes.items() if index not in invalid and sessions]
        if valid:
            courses.append(dict(code=code, title=title, au=float(au_match[1]), indexes=valid,
                                programmes=[programme], sample=False, source=SOURCE_PAGE))
        elif not indexes:
            excluded.append(dict(code=code, programme=programme, reason='No scheduled indexes'))
    if not courses:
        raise ValueError(f'No parseable courses for {programme}')
    return courses, excluded

def refresh(year, semester, cached=False):
    programmes = [f'{p};;{n};F' for p in ('CSC', 'CE', 'DSAI') for n in range(1, 5)]
    merged, excluded, sources = {}, [], []
    cache = ROOT / 'data' / 'raw'
    cache.mkdir(parents=True, exist_ok=True)
    for programme in programmes:
        payload = dict(acadsem=f'{year};{semester}', r_course_yr=programme, r_subj_code='',
                       r_search_type='F', boption='CLoad', staff_access='false')
        request = urllib.request.Request(SOURCE, data=urllib.parse.urlencode(payload).encode(),
                                         headers={'User-Agent': 'NTUPlanStudio/1.0 public timetable snapshot',
                                                  'Content-Type': 'application/x-www-form-urlencoded'})
        cache_file = cache / (programme.replace(';', '_') + '.html')
        if cached:
            raw = cache_file.read_bytes()
        else:
            with urllib.request.urlopen(request, timeout=60) as response:
                raw = response.read()
            cache_file.write_bytes(raw)
        html = raw.decode('utf-8', errors='strict')
        expected = rf'Class Schedule\s+{year}\s+Semester\s+{semester}'
        if not re.search(expected, BeautifulSoup(html, 'html.parser').get_text(' ', strip=True)):
            raise ValueError('Source returned a different semester; previous snapshot retained.')
        courses, skipped = parse_schedule(html, programme)
        excluded.extend(skipped)
        sources.append(dict(programme=programme, url=SOURCE, form=payload,
                            retrievedAt=datetime.fromtimestamp(cache_file.stat().st_mtime, timezone.utc).isoformat(),
                            sha256=hashlib.sha256(raw).hexdigest(), modules=len(courses)))
        for course in courses:
            if course['code'] not in merged:
                merged[course['code']] = course
                continue
            target = merged[course['code']]
            if target['title'] != course['title'] or target['au'] != course['au']:
                raise ValueError(f'Inconsistent module metadata for {course["code"]}')
            target['programmes'].append(programme)
            for index in course['indexes']:
                existing = next((i for i in target['indexes'] if i['id'] == index['id']), None)
                if existing and existing != index:
                    raise ValueError(f'Inconsistent complete index {course["code"]}/{index["id"]}')
                if not existing:
                    target['indexes'].append(index)
        print(f'{programme}: {len(courses)} modules, {len(skipped)} excluded indexes', flush=True)
        time.sleep(0.3)
    catalog = sorted(merged.values(), key=lambda m: m['code'])
    for course in catalog:
        course['indexes'].sort(key=lambda i: i['id'])
    metadata = dict(version=f'{year}-s{semester}', academicYear=f'{year}/{year+1}', semester=semester,
                    retrievedAt=max(s['retrievedAt'] for s in sources), source=SOURCE_PAGE,
                    coverage='Computer Science, Computer Engineering and Data Science & AI · Years 1–4 · Full-time',
                    moduleCount=len(catalog), indexCount=sum(len(m['indexes']) for m in catalog),
                    sessionCount=sum(len(i['sessions']) for m in catalog for i in m['indexes']),
                    programmes=programmes, sources=sources, excluded=excluded)
    output = '// Official NTU Class Schedule snapshot. Generated by scripts/refresh_catalog.py.\n'
    output += 'export const catalogMetadata = ' + json.dumps(metadata, ensure_ascii=False, indent=2) + ';\n'
    output += 'export const catalog = ' + json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + ';\n'
    output += 'export const initialSelections = [];\nexport const dataNotice = "Official NTU schedule snapshot · Verify final registration details in STARS.";\nexport default catalog;\n'
    # Only replace the working snapshot after every requested programme parses successfully.
    (ROOT / 'dist' / 'catalog.js').write_text(output, encoding='utf-8')
    (ROOT / 'data' / 'catalog-metadata.json').write_text(json.dumps(metadata, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
    print(json.dumps({key: metadata[key] for key in ('moduleCount', 'indexCount', 'sessionCount', 'retrievedAt')}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--year', type=int, default=2026)
    parser.add_argument('--semester', type=int, choices=[1, 2], default=1)
    parser.add_argument('--cached', action='store_true', help='Reparse previously downloaded source files offline')
    args = parser.parse_args()
    refresh(args.year, args.semester, args.cached)
