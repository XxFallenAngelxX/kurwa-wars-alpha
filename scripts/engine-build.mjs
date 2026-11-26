import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
export const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const read=p=>readFileSync(resolve(root,p),'utf8');
export function template(){
 const manifest=JSON.parse(read('src/engine/manifest.json'));
 const used=new Set();
 const html=read('src/engine/frame.html').replace(/@@KW_BLOCK_\d+@@/g,key=>{
  if(!manifest[key]||used.has(key))throw Error('Unknown or duplicate engine block: '+key);
  used.add(key);return manifest[key].map(read).join('');
 });
 if(used.size!==Object.keys(manifest).length)throw Error('Unused engine blocks');
 for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new Script(m[1],{filename:'engine script at '+m.index});
 return html;
}
export function generated(){return '// GENERATED: npm run build; edit src/engine and src/styles/engine instead.\nconst KW_TEMPLATE='+JSON.stringify(template())+';\n'}
export function build(){const p=resolve(root,'generated/engine-template.js');mkdirSync(dirname(p),{recursive:true});writeFileSync(p,generated(),'utf8');return p}
