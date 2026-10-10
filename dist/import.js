// OCR stays in this browser. Only the OCR engine and English model are downloaded.
const OCR_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
let enginePromise;

function loadEngine() {
  if (globalThis.Tesseract?.createWorker) return Promise.resolve(globalThis.Tesseract);
  if (enginePromise) return enginePromise;
  enginePromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = OCR_URL;
    script.async = true;
    const timer = setTimeout(() => fail(), 30000);
    function fail() {
      clearTimeout(timer);
      script.remove();
      reject(new Error('The image reader could not load. Check your internet connection, or paste the timetable text instead.'));
    }
    script.onerror = fail;
    script.onload = () => {
      clearTimeout(timer);
      if (globalThis.Tesseract?.createWorker) resolve(globalThis.Tesseract);
      else fail();
    };
    document.head.appendChild(script);
  }).catch(error => { enginePromise = undefined; throw error; });
  return enginePromise;
}

export async function recognizeImage(file, onProgress = () => {}) {
  if (!file || !/^image\/(png|jpeg|webp|bmp|gif)$/.test(file.type || '')) {
    throw new Error('Choose a PNG, JPG, WebP, BMP, or GIF timetable image.');
  }
  if (file.size > 20 * 1024 * 1024) throw new Error('This image is too large. Choose an image smaller than 20 MB.');
  if (!file.size) throw new Error('This image is empty. Choose another file.');
  const report = message => { try { onProgress(message); } catch { /* UI callbacks cannot interrupt recognition. */ } };
  report({ status: 'Loading image reader', progress: 0 });
  let worker;
  let imageURL;
  try {
    const engine = await loadEngine();
    imageURL = URL.createObjectURL(file);
    const image = new Image();
    image.src = imageURL;
    await image.decode().catch(() => { throw new Error('This image could not be opened. Try exporting it as a PNG or JPG.'); });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('This image has no readable content.');
    const scale = Math.min(2, 3200 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    worker = await engine.createWorker('eng', 1, { logger: report });
    const result = await worker.recognize(canvas);
    const text = result.data.text.trim();
    report({ status: 'Image read — review the results', progress: 1 });
    if (!text) throw new Error('No text was found. Try a clearer screenshot, or paste the timetable text.');
    return text;
  } catch (error) {
    if (/Choose|image|text|internet/i.test(error?.message || '')) throw error;
    throw new Error('Image recognition could not finish. The OCR engine needs an internet connection on first use. Try a clearer image or paste the text instead.');
  } finally {
    if (imageURL) URL.revokeObjectURL(imageURL);
    if (worker) await worker.terminate().catch(() => {});
  }
}

const DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
function minutes(value) {
  if (typeof value === 'number') return Number.isInteger(value) && value >= 0 && value <= 1440 ? value : NaN;
  const match = String(value).trim().match(/^(\d{1,2})[:.](\d{2})$/) || String(value).trim().match(/^(\d{2})(\d{2})$/);
  if (!match) return NaN;
  const h = Number(match[1]), m = Number(match[2]);
  return h <= 24 && m < 60 && (h < 24 || m === 0) ? h * 60 + m : NaN;
}

/** OCR is tentative. This parser never mutates a plan and must be reviewed by the user. */
export function parseImportText(text, catalog = []) {
  const matches = [], sessions = [], warnings = [];
  const modules = new Map(catalog.map(module => [module.code.toUpperCase(), module]));
  const seen = new Set();
  let currentCode = null;
  const lines = String(text || '').toUpperCase().replace(/[–—]/g, '-').split(/\r?\n/);
  for (const line of lines) {
    const codes = [...line.matchAll(/\b([A-Z]{2,4})\s?(\d{4})\b/g)]
      .filter(match => !['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN', 'LEC', 'TUT', 'LAB', 'SEM'].includes(match[1]))
      .map(match => match[1] + match[2]);
    if (codes.length) currentCode = codes[0];
    const ids = [...line.matchAll(/\b(?:DEMO-\d{5}|IMPORTED-[A-F0-9]{6}|\d{5})\b/g)]
      .map(match => /^IMPORTED-/.test(match[0]) ? match[0].toLowerCase().replace('imported-', 'IMPORTED-') : match[0]);
    if (!currentCode && ids.length) {
      for (const id of ids) {
        const owners = catalog.filter(module => module.indexes?.some(index => String(index.id) === id));
        if (owners.length === 1) {
          const code = owners[0].code.toUpperCase();
          const key = `${code}:${id}`;
          if (!seen.has(key)) { matches.push({ code, indexId: id }); seen.add(key); }
        } else if (owners.length > 1) warnings.push(`Index ${id} matches more than one module. Check its module code.`);
      }
    }
    for (const code of codes.length ? codes : currentCode && ids.length ? [currentCode] : []) {
      const module = modules.get(code);
      if (!module) warnings.push(`${code} is not in the loaded module catalog. Import its index data before planning.`);
      const validIds = ids.filter(id => module?.indexes?.some(index => String(index.id) === id));
      const candidates = validIds.length ? validIds : [null];
      for (const indexId of candidates) {
        const key = `${code}:${indexId}`;
        if (!seen.has(key)) { matches.push({ code, indexId }); seen.add(key); }
      }
      if (ids.length && !validIds.length) warnings.push(`No recognized index for ${code} on this line. Choose an index manually.`);
    }
    const dayMatch = line.match(/\b(MON(?:DAY)?|TUE(?:S(?:DAY)?)?|WED(?:NESDAY)?|THU(?:R(?:S(?:DAY)?)?)?|FRI(?:DAY)?|SAT(?:URDAY)?|SUN(?:DAY)?)\b/);
    const timeMatch = line.match(/\b(\d{1,2}[:.]\d{2}|\d{4})\s*(?:-|TO)\s*(\d{1,2}[:.]\d{2}|\d{4})\b/);
    if (currentCode && dayMatch && timeMatch) {
      const start = minutes(timeMatch[1]), end = minutes(timeMatch[2]);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        warnings.push(`Check the time range for ${currentCode}: ${timeMatch[0]}.`);
        continue;
      }
      const tail = line.slice(timeMatch.index + timeMatch[0].length).trim();
      const typeMatch = tail.match(/\b(LEC\/STUDIO|LEC|LECTURE|TUT|TUTORIAL|LAB|LABORATORY|SEM|SEMINAR|STUDIO|DES|PRJ)\b/);
      const type = typeMatch ? ({ LECTURE: 'LEC', TUTORIAL: 'TUT', LABORATORY: 'LAB', SEMINAR: 'SEM' }[typeMatch[1]] || typeMatch[1]) : 'CLASS';
      const venue = typeMatch ? tail.slice(typeMatch.index + typeMatch[0].length).replace(/^[\s,|:-]+/, '').trim() : '';
      sessions.push({ code: currentCode, day: DAY_NAMES.indexOf(dayMatch[1].slice(0, 3)), start, end, type, venue });
    }
  }
  if (!matches.length && !sessions.length) warnings.push('No module codes or structured sessions were detected. Correct the extracted text or paste lines such as SC1003 10011 MON 09:00-10:00 LEC LT2.');
  if (sessions.length) warnings.push('Extracted times and venues are tentative. Verify them against your official timetable before applying.');
  const resolvedCodes = new Set(matches.filter(match => match.indexId).map(match => match.code));
  return { matches: matches.filter(match => match.indexId || !resolvedCodes.has(match.code)), sessions, warnings: [...new Set(warnings)] };
}

export function parseCatalogJSON(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('The catalog is not valid JSON. Choose a JSON array of modules.'); }
  if (!Array.isArray(data) || !data.length) throw new Error('The catalog must be a nonempty JSON array of modules.');
  if (data.length > 10000) throw new Error('The catalog exceeds the 10,000-module limit.');
  const codes = new Set();
  return data.map((module, moduleNumber) => {
    const fail = detail => { throw new Error(`Module ${moduleNumber + 1}: ${detail}`); };
    if (!module || typeof module !== 'object' || Array.isArray(module)) fail('expected an object.');
    const code = String(module.code || '').trim().toUpperCase();
    if (!/^[A-Z]{2,4}\d{4}$/.test(code)) fail('code must look like SC1003.');
    if (codes.has(code)) fail(`duplicate module code ${code}.`);
    codes.add(code);
    if (typeof module.title !== 'string' || !module.title.trim()) fail('title is required.');
    if (!Number.isFinite(Number(module.au)) || Number(module.au) < 0 || Number(module.au) > 40) fail('au must be a number from 0 to 40 (0 means unknown).');
    if (!Array.isArray(module.indexes) || !module.indexes.length) fail('at least one index is required.');
    const ids = new Set();
    const indexes = module.indexes.map(index => {
      const id = String(index?.id || '').trim();
      if (!/^(?:\d{5}|DEMO-\d{5}|IMPORTED-[a-f0-9]{6})$/.test(id)) fail('each index id must have five digits, DEMO-five digits, or IMPORTED-six hexadecimal digits.');
      if (ids.has(id)) fail(`duplicate index ${id}.`);
      ids.add(id);
      if (!Array.isArray(index.sessions) || !index.sessions.length) fail(`index ${id} needs at least one session.`);
      const sessions = index.sessions.map(session => {
        if (!session || typeof session !== 'object') fail(`index ${id} has an invalid session.`);
        const day = typeof session.day === 'number' ? session.day : DAY_NAMES.indexOf(String(session.day).toUpperCase().slice(0, 3));
        const start = minutes(session.start), end = minutes(session.end);
        if (!Number.isInteger(day) || day < 0 || day > 6) fail(`index ${id}: day must be 0–6 or MON–SUN.`);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) fail(`index ${id}: invalid start/end (use minutes or HH:MM).`);
        if (session.weeks !== undefined && (!Array.isArray(session.weeks) || !session.weeks.length || session.weeks.some(week => !Number.isInteger(week) || week < 1 || week > 13))) fail(`index ${id}: weeks must be an array of week numbers from 1 to 13.`);
        return { ...session, day, start, end, type: String(session.type || 'CLASS').trim().toUpperCase(), venue: String(session.venue || '').trim() };
      });
      return { ...index, id, sessions };
    });
    return { ...module, code, title: module.title.trim(), au: Number(module.au), indexes };
  });
}
