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

The included catalogue is a demonstration dataset: its `DEMO-` indexes, class times, and venues are fictional. Import verified module/index data before using a plan for registration. See [the data guide](DATA.md) for the JSON format and official timetable sources.

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

Tests cover scheduling boundaries, week-specific clashes, protected periods, locked indexes, infeasible schedules, text parsing, catalogue validation, and backup compatibility. Browser layout and end-to-end image OCR have not yet been verified through automated browser testing.

## About

An independent project inspired by [NTUMods](https://ntumods.com/). Not affiliated with NTU or NTUMods. The interface and application code are original; no third-party project source or official timetable dataset is bundled.
