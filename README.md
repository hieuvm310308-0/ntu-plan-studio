# NTU Plan Studio

**Make room for what matters.**

NTU Plan Studio helps students build a semester timetable around their lives. Add your modules, protect the hours you need free, and find class indexes that fit together.

[Open the app](https://ntu-plan-studio.famouspond5.chatgpt.site) · [Timetable data guide](DATA.md)

The hosted app currently has owner-only access. Run the project locally to try it yourself.

## A timetable that fits your life

- **Import from an image.** Read timetable screenshots with browser-based OCR, correct recognized text, and review module indexes and class details before applying them.
- **Chat with Gemma.** Ask questions about all your plans, explain clashes, compare indexes, or request timetable changes using your own Google AI Studio API key. Preview changes checked by the scheduling engine and apply them when ready.
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

### AI chat

Open **AI chat** in the top navigation or the planner sidebar. Get your own key from [Google AI Studio](https://aistudio.google.com/apikey), enter it in the connection field, and select **Connect Gemma**. The app lists Gemma models available to your key and prefers `gemma-4-26b-a4b-it` when available. It uses Google's [Gemma API](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api) directly from your browser; it does not fall back to a different model family.

Every message includes fresh context for all saved plans: module choices and locks, complete selected classes, AU totals, protected periods, detected clashes, dataset provenance, the visible teaching week, and every alternative index for modules in your plans or named by code in your question. The assistant also sees a summary of the remaining catalogue. Select **View context** to inspect the exact plan data sent. Requests that exceed the model's context budget are rejected explicitly; plan details are not silently dropped. Up to six recent conversation exchanges accompany each message.

Try “Explain the clashes in my plan”, “Keep Fridays free and preserve my locked indexes”, or “Compare my backup plans”. Proposed changes are checked against the actual catalogue and local scheduler before appearing for review. **Apply changes** commits the reviewed proposal; **Dismiss** leaves plans untouched. If the plans change while Gemma is thinking or after the preview is created, the proposal cannot be applied until refreshed.

The key is kept only in page memory and forgotten on reload or **Forget key**. It is sent to Google in an authentication header, never stored in plans, exports, URLs, or our server. Chat history is also held only in memory. Sending a message shares your complete plan context and conversation with Google; Google's API terms, availability, and your project quota apply. No production key is bundled. Live model responses must be tested with your own key; automated provider tests use mocked responses.

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
| `dist/catalog.js` | Official NTU semester catalogue and provenance |
| `dist/ai.js` | Gemma API, complete plan context, and validated change previews |
| `dist/chat.js` | Chat interface and in-memory key/history handling |
| `server.mjs` | Local static server |

Run the automated checks:

```sh
node dist/engine.test.js
node dist/import.test.js
node integration.test.mjs
node ai.test.mjs
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
