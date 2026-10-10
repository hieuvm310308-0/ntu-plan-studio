# NTU Plan Studio

**Make room for what matters.**

NTU Plan Studio helps students build a semester timetable around their lives. Add your modules, protect the hours you need free, and find class indexes that fit together.

[Open the app](https://ntu-plan-studio.famouspond5.chatgpt.site) · [Timetable data guide](DATA.md)

The hosted app currently has owner-only access. Run the project locally to try it yourself.

## A timetable that fits your life

- **Import from an image.** Read timetable screenshots with browser-based OCR, correct recognized text, and review module indexes and class details before applying them.
- **Protect your time.** Keep mornings, Fridays, lunch breaks, work shifts, or custom periods free.
- **Find compatible indexes.** Smart Planner searches complete module indexes for schedules that avoid class clashes and protected periods, including teaching-week differences.
- **Keep your preferred classes.** Lock an index while the planner searches alternatives for your other modules.
- **Compare backup plans.** Duplicate a plan and explore alternatives before registration.
- **Keep your plans close.** Search modules, inspect classes, save plans on your device, export classes as CSV, and back up or restore plans as JSON.

## Get started

1. Add modules from the catalogue, or import verified semester module data.
2. Open **Preferences** and add the periods you want to keep free.
3. Lock any indexes you want to retain, then select **Find my best timetable**.
4. Compare the suggested options and apply your favourite.

Already have a timetable screenshot? Select **Import timetable**, review the extracted text, and choose the matching indexes or extracted classes to add.

## Data and privacy

The included catalogue is sourced directly from NTU's public **AY 2026/27 Semester 1 Class Schedule**, retrieved on **10 October 2026**. It includes **82 modules, 1,232 indexes, and 3,112 class sessions** across full-time Computer Science, Computer Engineering, and Data Science & Artificial Intelligence, Years 1–4, including shared modules. Class groups, venues, teaching-week ranges, weekend classes, and every session belonging to each index are preserved.

This is a dated snapshot, not a live vacancy feed or a university-wide catalogue. Verify final details in STARS before registration. See [the data guide](DATA.md) for coverage, provenance, and refreshing the catalogue. You can also import additional verified module data as JSON.

Existing demo plans are upgraded to the official catalogue. Valid real index choices, explicit user imports, manual OCR indexes, and protected time are retained. Fictional or unavailable selections are removed with a notice; the earlier browser backup remains untouched. New users start with an empty plan.

Plans are stored in your browser. Export a JSON backup to move them between devices or browsers. Image recognition runs locally using Tesseract.js; images are not uploaded to a recognition API. An internet connection is needed to download the OCR engine and English model on first use, and to load optional fonts. Pasting timetable text is also supported.

OCR can miss classes or misread details. Verify extracted sessions against the official timetable, especially when creating a manual imported index. Smart Planner can only check the class data you provide; it does not connect to STARS, check vacancies, or register modules. Its bounded search favours shorter gaps and fewer teaching days among the schedules it finds.

## Run locally

Requires Node.js 20 or later. No dependencies or build step are needed.

```sh
git clone https://github.com/hieuvm310308-0/ntu-plan-studio.git
cd ntu-plan-studio
node server.mjs
```

Open [localhost:4173](http://127.0.0.1:4173).

## Development

The app uses HTML, CSS, and JavaScript modules. The scheduling engine and import parser are independent of the interface.

| File | Purpose |
| --- | --- |
| `dist/app.js` | Timetable interface, plans, imports, and exports |
| `dist/engine.js` | Week-aware conflict detection and index search |
| `dist/import.js` | Image OCR, text parsing, and catalogue validation |
| `dist/catalog.js` | Illustrative module data |
| `server.mjs` | Local static server |

Run the automated checks:

```sh
node dist/engine.test.js
node dist/import.test.js
node integration.test.mjs
```

Tests cover scheduling boundaries, week-specific clashes, weekends, protected periods, locked indexes, infeasible schedules, text parsing, catalogue validation, complete official index rows, and saved-plan migration. Browser layout and end-to-end image OCR have not yet been verified through automated browser testing.

### Refresh official timetable data

The refresh script queries the public NTU programme schedule for all four years of CS, CE, and DSAI. Python 3.10+ and Beautiful Soup are required only for refreshing data.

```sh
python -m pip install -r scripts/requirements.txt
python scripts/refresh_catalog.py --year 2026 --semester 1
python scripts/test_refresh_catalog.py
node integration.test.mjs
```

The script writes `dist/catalog.js` and `data/catalog-metadata.json` after all twelve programme queries validate. It retains raw HTML locally under ignored `data/raw/` and records each response's SHA-256 hash, retrieval time, and query parameters in the metadata. Unsupported or incomplete indexes are reported in the metadata and excluded as a whole.

## About

An independent project inspired by [NTUMods](https://ntumods.com/). Not affiliated with NTU or NTUMods. The interface and application code are original. Timetable facts are attributed to [NTU Class Schedule](https://wish.wis.ntu.edu.sg/webexe/owa/aus_schedule.main).
