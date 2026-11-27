import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {Script,runInNewContext} from 'node:vm';
import {root,read,template,generated} from './engine-build.mjs';
import assert from 'node:assert/strict';
import {releaseVersion} from './release-version.mjs';
assert.equal(read('generated/sw-version.js'),releaseVersion(),'Generated release version is outdated; run npm run build');
const version=JSON.parse(read('package.json')).version;
assert(read('src/engine/frame.html').includes('<span class="gameVersion">v'+version+'</span>'),'Header version differs from package.json');
assert.equal(read('generated/engine-template.js'),generated(),'Generated engine is outdated; run npm run build');
for(const name of ['container','electronics','expedition','mine','pickaxe','scrapyard']){const p='assets/activities/'+name+'.webp';assert(existsSync(resolve(root,p)),'Missing activity artwork: '+p);}
assert(existsSync(resolve(root,'assets/branding/kurvflict-loading.webp')),'Missing KURVFLICT loading artwork');
assert.match(read('src/engine/frame.html'), /<header><div class="kwHeaderBrand"><img class="kwHeaderLogo"[^>]*><span class="gameVersion">[^<]*<\/span><\/div>/);
const logoCss=read('src/styles/engine/11-responsive-header.css');
assert.match(logoCss,/header:has\(>\.kwHeaderBrand\)\s*\{[^}]*minmax\(0,140px\) minmax\(max-content,1fr\) 40px 40px/);
assert.match(logoCss,/header>\.kwHeaderBrand\s*\{[^}]*height:46px/);
assert.match(logoCss,/\.kwHeaderBrand>\.kwHeaderLogo\s*\{[^}]*object-fit:fill/);
assert.match(logoCss,/\.kwHeaderBrand>\.gameVersion\s*\{[^}]*position:absolute; left:2px; bottom:2px;[^}]*color:#fff; background:#000/);
const paths=new Set();
const webManifest=JSON.parse(read('manifest.webmanifest'));
for(const icon of webManifest.icons){
 const iconPath=new URL(icon.src,'https://example.invalid/').pathname.slice(1);
 assert(existsSync(resolve(root,iconPath)),'Missing manifest icon: '+icon.src);
}
for(const page of ['index.html','gm.html']){
 const html=read(page);
 for(const m of html.matchAll(/(?:href|src)="\.\/(assets\/icons\/[^"?]+)(?:\?[^" ]*)?"/g))
  assert(existsSync(resolve(root,m[1])),'Missing page icon: '+m[1]);
 for(const m of html.matchAll(/<script\b[^>]*\bsrc="\.\/([^"?]+)(?:\?[^"]*)?"[^>]*><\/script>/g))paths.add(m[1]);
}
for(let i=1;i<=5;i++)paths.add('assets/packs/assets-'+i+'.js');
paths.add('assets/audio/host-audio.js');
const assetKeys=new Set();
for(const p of paths){
 assert(existsSync(resolve(root,p)), 'Missing '+p);
 new Script(read(p),{filename:p});
 if(p.startsWith('assets/packs/')){
  const m=read(p).match(/^Object\.assign\(KW_ASSETS,(\{[\s\S]*\})\);\s*$/);
  for(const key of Object.keys(JSON.parse(m[1])))assetKeys.add(key);
 }
}
for(const m of template().matchAll(/@@LOCAL:([^@]+)@@/g))assert(assetKeys.has(m[1]),'Missing asset: '+m[1]);
const layout=JSON.parse(read('world-layout.js').match(/=\s*(\{[\s\S]*\})\s*;/)[1]);
assert.equal(Object.keys(layout).length,21);
for(const [id,v] of Object.entries(layout)){assert(v.x>=1&&v.x<=99&&v.y>=1&&v.y<=99&&v.scale>=.4&&v.scale<=2.5&&Number.isInteger(v.z)&&v.z>=1&&v.z<=20,id)}
new Script(read('sw.js'),{filename:'sw.js'});
console.log('OK: engine assembly, JS syntax, entry points, '+assetKeys.size+' asset keys, 21 world positions');

// Content regressions: stable catalog identities, distinct translated dialogue and actual unique descriptions.
const content=read('src/engine/core/02-content-items.js');
const section=(a,b)=>{const start=content.indexOf(a),end=content.indexOf(b,start);assert(start>=0&&end>start,'Missing source section '+a);return content.slice(start,end)};
const data={};runInNewContext(section('const portrait=','function itemArt')+section('const ITEM_TITLE_VARIANTS=','function make(')+section('const UNIQUE_BASE=','const REGULAR_POOL=')+section('function uniqueMeta(','function makeUnique(')+';this.audit={catalog,UNIQUES,ITEM_TITLE_VARIANTS,REGULAR_EXTRA,uniqueFlavorText}',data);
for(const [i,row] of data.audit.ITEM_TITLE_VARIANTS.entries())assert(row.length===6&&row.every(v=>typeof v==='string'&&v.trim()),'Incomplete item title '+i);
for(const [i,row] of data.audit.REGULAR_EXTRA.entries())assert(row.slice(1,7).every(v=>typeof v==='string'&&v.trim()),'Incomplete regular item '+i);
for(const [i,row] of data.audit.UNIQUES.entries())for(const lang of ['de','en','ru']){const text=data.audit.uniqueFlavorText(i,lang);assert(text&&!text.startsWith(row[lang==='en'?6:lang==='ru'?7:0]+' ·'),'Unique description is only a title: '+i+' '+lang);}
const dialogue=read('src/engine/features/02-chat-dialogue.js'),dialogueContext={};runInNewContext(dialogue.slice(0,dialogue.indexOf('const CHAT46_PM='))+';this.lines=[...CHAT46_LINES,...CHAT47_LINES]',dialogueContext);
for(const [i,row] of dialogueContext.lines.entries())assert(row.length===3&&row.every(v=>typeof v==='string'&&v.trim()),'Incomplete dialogue '+i);
for(let lang=0;lang<3;lang++)assert.equal(new Set(dialogueContext.lines.map(row=>row[lang])).size,dialogueContext.lines.length,'Duplicate combat dialogue in language '+lang);
console.log('OK: '+dialogueContext.lines.length+' combat lines, '+data.audit.UNIQUES.length+' unique descriptions, '+data.audit.ITEM_TITLE_VARIANTS.length+' item title variants in DE/EN/RU');
