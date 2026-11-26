import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {Script} from 'node:vm';
import {root,read,template,generated} from './engine-build.mjs';
import assert from 'node:assert/strict';
assert.equal(read('generated/engine-template.js'),generated(),'Generated engine is outdated; run npm run build');
const paths=new Set();
for(const page of ['index.html','gm.html']){
 const html=read(page);
 for(const m of html.matchAll(/<script\b[^>]*\bsrc="\.\/([^"?]+)(?:\?[^"]*)?"[^>]*><\/script>/g))paths.add(m[1]);
}
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
assert.equal(Object.keys(layout).length,18);
for(const [id,v] of Object.entries(layout)){assert(v.x>=1&&v.x<=99&&v.y>=1&&v.y<=99&&v.scale>=.4&&v.scale<=2.5&&Number.isInteger(v.z)&&v.z>=1&&v.z<=20,id)}
new Script(read('sw.js'),{filename:'sw.js'});
console.log('OK: engine assembly, JS syntax, entry points, '+assetKeys.size+' asset keys, 18 world positions');
