# Timetable data

The bundled `dist/catalog.js` is a demonstration catalog. It contains ten illustrative NTU computing module labels and three **fictional** class indexes per module. Indexes are prefixed `DEMO-` so they cannot be confused with registration indexes. Class times and venues are examples, not a current official semester timetable. No claim is made about module availability, AU, index validity, teaching weeks, vacancies, or exams.

## Importing actual semester data

Use NTU's public [Class Schedule](https://wish.wis.ntu.edu.sg/webexe/owa/aus_schedule.main). Select the academic year, semester, programme and study year, or search a course code. NTU's [course registration instructions](https://www.ntu.edu.sg/wkwsci/admissions/useful-links/undergraduate/course-registration-instructions) direct students to this class schedule and STARS. Final registration and vacancies must be checked in STARS.

The current app accepts JSON catalogs through its catalog import control. Normalize records to this shape:

```json
[
  {
    "code": "SC1003",
    "title": "Introduction to Computational Thinking",
    "au": 3,
    "color": "#6c5ce7",
    "indexes": [
      {
        "id": "ACTUAL_INDEX_FROM_OFFICIAL_SOURCE",
        "sessions": [
          {
            "day": 0,
            "start": 600,
            "end": 720,
            "type": "LEC",
            "venue": "ACTUAL_VENUE",
            "weeks": [1, 2, 3]
          }
        ]
      }
    ]
  }
]
```

Days use Monday = 0 through Friday = 4. Times are minutes after midnight, with exclusive end times. Preserve **every** class component belonging to each index, including shared lectures. An omitted `weeks` field means the session repeats every teaching week. Preserve actual teaching week numbers where available so alternating week classes can be evaluated correctly. Do not invent unavailable sessions or indexes. Keep semester, source URL, retrieval timestamp and validation status alongside any production dataset.

Screenshot OCR should always lead to a review step: course codes, indexes and times may be misread. Matching an OCR index requires that exact index to exist in the imported catalog; a module code alone cannot establish the student's actual class schedule.

## Reference product and source research

The [NTUMods timetable page](https://ntumods.com/timetable) provides the reference layout: a weekday timetable, module search, registered modules, custom blocks, and Calendar / Generate / AI modes. The [NTUMods home page](https://ntumods.com/) describes index comparison, clash-free generation and personal time constraints. The independent app created here uses original code and does not claim affiliation.

A public [NTUMods backend repository](https://github.com/ntumods-org/ntumods-backend) and an older [system repository](https://github.com/yequan99/NTUMods) exist. No repository code or live dataset was copied. The backend repository is listed as AGPL-3.0; review applicable licenses and access terms before using third-party code or data. Research on 10 October 2026 did not establish a stable verified public data API, so this prototype does not advertise a live official feed.
