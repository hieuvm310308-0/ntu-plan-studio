import {parseCatalogJSON} from './import.js';

/** Refresh official records while preserving explicit user imports and valid plan choices. */
export function upgradeState(saved, official, metadata) {
  const original = parseCatalogJSON(JSON.stringify(saved.catalog));
  const merged = new Map(official.map(m => [m.code, structuredClone(m)]));
  for (const old of original) {
    if (old.custom || (!old.sample && !old.source)) { merged.set(old.code, {...old,custom:true}); continue; }
    const manual = old.indexes.filter(i => i.id.startsWith('IMPORTED-'));
    const current = merged.get(old.code);
    if (current) current.indexes.push(...manual.filter(i => !current.indexes.some(x => x.id === i.id)));
    else if (manual.length) merged.set(old.code, {...old, sample:false, indexes:manual});
    else if (!old.sample && !old.source) merged.set(old.code, {...old, custom:true});
  }
  const catalog = [...merged.values()];
  let removed = 0;
  const plans = saved.plans.map(p => ({...p, modules:p.modules.filter(m => {
    const valid = !String(m.selected).startsWith('DEMO-') && catalog.some(c => c.code === m.code && c.indexes.some(i => i.id === m.selected));
    if (!valid) removed++;
    return valid;
  })}));
  return {state:{...saved, catalog, plans, catalogVersion:metadata.retrievedAt}, removed};
}
