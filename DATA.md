# Timetable data

The bundled catalogue is a snapshot of the public [NTU Class Schedule](https://wish.wis.ntu.edu.sg/webexe/owa/aus_schedule.main), retrieved on **10 October 2026** for **AY 2026/27 Semester 1**.

## Coverage

- Full-time Computer Science (`CSC`), Computer Engineering (`CE`), and Data Science & Artificial Intelligence (`DSAI`), Years 1–4.
- **82 modules, 1,232 class indexes, and 3,112 sessions**, including shared ICC and other modules returned for these programmes.
- All returned class components within each index, including lectures, tutorials, labs, class groups, venues, source remarks, and teaching weeks.
- Monday–Sunday scheduling; HY0001 index 17991 includes a Saturday class.

This is a programme-based snapshot, not the complete NTU catalogue. Modules returned in a programme schedule do not establish individual registration eligibility. The dataset has no exam, vacancy, bidding, or registration data. Verify those details and final class schedules in STARS.

## Provenance and refresh

`scripts/refresh_catalog.py` submits the same public programme queries as NTU's schedule form to `AUS_SCHEDULE.main_display1`. No login or private student data is used. The importer was written for this project; no NTUMods project code or dataset was copied.

`data/catalog-metadata.json` records the academic year, semester, scope, retrieval time, response hashes, exact form parameters, counts, and any excluded indexes. Raw response HTML is stored locally in ignored `data/raw/` for inspection. `dist/catalog.js` contains the normalized catalogue and metadata used by the app.

```sh
python -m pip install -r scripts/requirements.txt
python scripts/refresh_catalog.py --year 2026 --semester 1
python scripts/test_refresh_catalog.py
node integration.test.mjs
```

The refresh validates the semester and every course table, carries blank index cells forward to preserve continuation rows, expands teaching-week lists/ranges, and merges identical records across programmes. Conflicting copies fail the refresh. Any index containing an unsupported day, time, or week format is excluded in full and reported. The current snapshot has no excluded indexes. Files are written only after all twelve requested programme pages parse successfully.

The snapshot does not automatically refresh when the app opens. Run the script and publish the updated files to refresh it.

## Additional module imports

Use **Import data** to add verified modules outside the included coverage. JSON imports must be an array of modules:

```json
[
  {
    "code": "SC1001",
    "title": "INTRODUCTION TO COMPUTATIONAL THINKING & PROGRAMMING",
    "au": 2,
    "indexes": [
      {
        "id": "10001",
        "sessions": [
          {"day": 0, "start": 570, "end": 620, "type": "LEC/STUDIO", "venue": "LT19A"},
          {"day": 3, "start": 630, "end": 680, "type": "LEC/STUDIO", "venue": "LKC-LT"},
          {"day": 2, "start": 510, "end": 560, "type": "TUT", "venue": "SWLAB1"},
          {"day": 2, "start": 570, "end": 620, "type": "LAB", "venue": "SWLAB1"}
        ]
      }
    ]
  }
]
```

This example contains one complete official index from the dated snapshot. Include every available index and every session you intend the planner to compare. Days use Monday = 0 through Sunday = 6; times are minutes after midnight with exclusive end times. Optional `weeks` lists teaching weeks 1–13; omitting it means every teaching week. Preserve actual NTU end times such as 10:20 rather than rounding to 10:30.

User-imported catalogues are labelled separately. OCR imports require review: matching a module code alone cannot establish its registered index, and a manually imported index only contains the sessions extracted or entered by the user.
