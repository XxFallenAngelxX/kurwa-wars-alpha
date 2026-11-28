import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=read('src/engine/features/06-placement-tutorial-runtime.js'),rows=read('src/engine/features/05-onboarding.js');
const groups=new Function(ui.slice(ui.indexOf('const kwGuideGroups55='),ui.indexOf('function kwGuideItems55('))+'return kwGuideGroups55')();
const topics=new Function(rows.slice(rows.indexOf('function kwGuideRows54()'))+'return kwGuideRows54()')();
const {tiles,assets,categories,icon}=new Function('profileArt',ui.slice(ui.indexOf('const KW_GUIDE_ATLAS55='),ui.indexOf('function kwGuideEffects55('))+'return {tiles:KW_GUIDE_TILES55,assets:KW_GUIDE_ASSETS55,categories:KW_GUIDE_CATEGORY_ART55,icon:kwGuideIcon55}')(()=> './assets/raw/images/npc45_mopo.webp');
const ids=topics.map(r=>r[0]);assert.equal(ids.length,27);assert.equal(new Set(groups.flatMap(g=>g[1])).size,ids.length);
assert.deepEqual([...groups.flatMap(g=>g[1])].sort(),[...ids].sort());
for(const id of ids){assert.ok(Object.hasOwn(tiles,id)||Object.hasOwn(assets,id)||id==='Profile',id);assert.ok(icon(id).includes('kwGuideIcon'));assert.ok(!icon(id).includes('itemArt'))}
for(const src of Object.values(assets))assert.ok(existsSync(new URL('../'+src.replace(/^\.\//,''),import.meta.url)),src);
assert.equal(new Set(Object.values(tiles)).size,9);assert.equal(categories.length,groups.length);assert.ok(categories.every(id=>Object.hasOwn(tiles,id)||Object.hasOwn(assets,id)));
const atlas=readFileSync(new URL('../assets/ui/guide-icons.webp',import.meta.url));assert.equal(atlas.toString('ascii',0,4),'RIFF');assert.equal(atlas.toString('ascii',8,12),'WEBP');assert.equal(atlas.readUInt16LE(26)&0x3fff,168);assert.equal(atlas.readUInt16LE(28)&0x3fff,168);
assert.ok(!ui.includes('function kwGuideArt55('));console.log('OK guide artwork: 27 topics, 5 groups, 9 new atlas tiles, all asset paths');
