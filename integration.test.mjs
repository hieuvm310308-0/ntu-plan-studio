import assert from 'node:assert/strict';
import {catalog,demoSelections} from './dist/catalog.js';
import {parseCatalogJSON,parseImportText} from './dist/import.js';
import {conflicts,solve} from './dist/engine.js';
const restored=parseCatalogJSON(JSON.stringify(catalog));
assert.equal(restored.length,10);
const chosen=demoSelections.map(x=>({...restored.find(m=>m.code===x.code),selected:x.indexId,locked:false}));
assert.equal(conflicts(chosen.flatMap(m=>m.indexes.find(i=>i.id===m.selected).sessions)).length,0);
const blocks=[{day:4,start:0,end:1440},{day:0,start:0,end:600}];
const options=solve(chosen,blocks,{maxResults:6});
assert.ok(options.solutions.length);
for(const option of options.solutions){assert.equal(conflicts(chosen.flatMap(m=>m.indexes.find(i=>i.id===option.selections[m.code]).sessions),blocks).length,0)}
assert.equal(parseImportText('SC1003 DEMO-10001',catalog).matches[0].indexId,'DEMO-10001');
const imported={code:'SC9999',title:'Imported module',au:0,indexes:[{id:'IMPORTED-abcdef',sessions:[{day:0,start:600,end:660}]}]};
assert.equal(parseCatalogJSON(JSON.stringify([imported]))[0].au,0);
console.log('Integrated catalog, solver, sample restoration and manual import checks passed.');
