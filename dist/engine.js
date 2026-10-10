/** Timetable constraint engine. All times are minutes after midnight. */
const SEMESTER_WEEKS = Array.from({ length: 13 }, (_, i) => i + 1);
const MAX_VISITED = 120000;

function sessionErrors(session) {
  if (!session || typeof session !== 'object') return ['Session must be an object.'];
  const errors = [];
  if (!Number.isInteger(session.day) || session.day < 0 || session.day > 6) errors.push('Day must be 0–6 (Monday–Sunday).');
  if (!Number.isInteger(session.start) || !Number.isInteger(session.end) || session.start < 0 || session.end > 1440 || session.end <= session.start) errors.push('Session times must be valid minutes, with end after start.');
  if (session.weeks !== undefined && (!Array.isArray(session.weeks) || !session.weeks.length || session.weeks.some(w => !Number.isInteger(w) || w < 1 || w > 13))) errors.push('Weeks must contain semester week numbers 1–13.');
  return errors;
}

export function overlaps(a, b) {
  if (a.day !== b.day || a.start >= b.end || b.start >= a.end) return false;
  const aw = a.weeks ?? SEMESTER_WEEKS;
  const bw = b.weeks ?? SEMESTER_WEEKS;
  return aw.some(week => bw.includes(week));
}

/** Includes clashes within sessions and clashes between sessions and blocked times. */
export function conflicts(sessions, blocks = []) {
  const pairs = [];
  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      if (overlaps(sessions[i], sessions[j])) pairs.push({ a: sessions[i], b: sessions[j], type: 'module' });
    }
    for (const block of blocks) {
      if (overlaps(sessions[i], block)) pairs.push({ a: sessions[i], b: block, type: 'blocked' });
    }
  }
  return pairs;
}

export function validateModule(module) {
  const errors = [];
  if (!module || typeof module !== 'object') return { valid: false, errors: ['Module must be an object.'] };
  if (typeof module.code !== 'string' || !module.code.trim()) errors.push('Module code is required.');
  if (!Array.isArray(module.indexes) || !module.indexes.length) errors.push('Module needs at least one index.');
  const ids = new Set();
  for (const index of Array.isArray(module.indexes) ? module.indexes : []) {
    if (!index || index.id === undefined || index.id === null || String(index.id).trim() === '') {
      errors.push('Each index needs an id.');
      continue;
    }
    if (ids.has(String(index.id))) errors.push(`Duplicate index ${index.id}.`);
    ids.add(String(index.id));
    if (!Array.isArray(index.sessions) || !index.sessions.length) errors.push(`Index ${index.id} needs at least one session.`);
    for (const session of Array.isArray(index.sessions) ? index.sessions : []) {
      errors.push(...sessionErrors(session).map(error => `Index ${index.id}: ${error}`));
    }
  }
  if (module.locked && !ids.has(String(module.selected))) errors.push('Locked module needs a selected index that exists.');
  return { valid: errors.length === 0, errors };
}

// Count gaps for each actual teaching week, so alternating-week classes are ranked correctly.
function scoreSessions(sessions) {
  let gaps = 0;
  let days = 0;
  for (const week of SEMESTER_WEEKS) {
    for (let day = 0; day < 7; day++) {
      const meetings = sessions.filter(s => s.day === day && (s.weeks ?? SEMESTER_WEEKS).includes(week)).sort((a, b) => a.start - b.start);
      if (!meetings.length) continue;
      days++;
      for (let i = 1; i < meetings.length; i++) gaps += meetings[i].start - meetings[i - 1].end;
    }
  }
  // All gap-minute totals dominate the possible 91 teaching-day tie breaker.
  return gaps * 100 + days;
}

export function solve(modules, blocks = [], { maxResults = 6 } = {}) {
  const result = { solutions: [], reason: '', visited: 0, truncated: false };
  if (!Array.isArray(modules) || !modules.length) return { ...result, reason: 'Add at least one module to build a timetable.' };
  if (!Number.isInteger(maxResults) || maxResults < 1) return { ...result, reason: 'maxResults must be a positive integer.' };
  if (!Array.isArray(blocks) || blocks.some(block => sessionErrors(block).length)) return { ...result, reason: 'A blocked time has invalid days, times, or weeks.' };
  const seenCodes = new Set();
  for (const module of modules) {
    const validation = validateModule(module);
    if (!validation.valid) return { ...result, reason: `${module?.code || 'Module'}: ${validation.errors.join(' ')}` };
    if (seenCodes.has(module.code)) return { ...result, reason: `Duplicate module code ${module.code}.` };
    seenCodes.add(module.code);
  }
  const candidates = modules.map(module => ({
    module,
    indexes: module.indexes.filter(index => (!module.locked || String(index.id) === String(module.selected)) && conflicts(index.sessions, blocks).length === 0)
      .sort((a, b) => String(a.id).localeCompare(String(b.id), 'en', { numeric: true }))
  }));
  const impossible = candidates.find(candidate => !candidate.indexes.length);
  if (impossible) return { ...result, reason: `${impossible.module.code} has no ${impossible.module.locked ? 'locked ' : ''}index that fits your blocked times and has no internal clashes.` };
  candidates.sort((a, b) => a.indexes.length - b.indexes.length || a.module.code.localeCompare(b.module.code));
  const selected = {};
  const occupied = [];
  function search(depth) {
    if (depth === candidates.length) {
      const selections = Object.fromEntries(modules.map(module => [module.code, selected[module.code]]));
      const solution = { selections, score: scoreSessions(occupied) };
      result.solutions.push(solution);
      result.solutions.sort((a, b) => a.score - b.score || JSON.stringify(a.selections).localeCompare(JSON.stringify(b.selections), 'en', { numeric: true }));
      if (result.solutions.length > maxResults) result.solutions.pop();
      return;
    }
    const { module, indexes } = candidates[depth];
    for (const index of indexes) {
      if (result.visited >= MAX_VISITED) { result.truncated = true; return; }
      result.visited++;
      if (index.sessions.some(session => occupied.some(existing => overlaps(session, existing)))) continue;
      selected[module.code] = index.id;
      const previousLength = occupied.length;
      occupied.push(...index.sessions);
      search(depth + 1);
      occupied.length = previousLength;
      delete selected[module.code];
      if (result.truncated) return;
    }
  }
  search(0);
  result.reason = result.solutions.length
    ? (result.truncated ? 'Search limit reached. Showing the best schedules found so far.' : 'Schedules ranked by the smallest gaps, then fewer teaching days.')
    : (result.truncated ? 'Search limit reached without finding a schedule. Try locking an index or reducing the number of modules.' : 'No combination fits all module sessions and blocked times. Try another index or relax a blocked time.');
  return result;
}
