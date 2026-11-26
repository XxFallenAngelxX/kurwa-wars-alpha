import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname,basename} from 'node:path';
import {root,read} from './engine-build.mjs';
const mode=process.argv[2];if(!['unpack','pack'].includes(mode))throw Error('Use unpack or pack');
const packFiles=Array.from({length:5},(_,i)=>'assets/packs/assets-'+(i+1)+'.js');
const audioFile='assets/audio/host-audio.js';
const manifestPath=resolve(root,'assets/raw/manifest.json');
const decode=s=>{const m=s.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);if(!m)throw Error('Unsupported asset URI');return [m[1],m[2]]};
if(mode==='unpack'){
 const entries=[];
 function unpack(data,path,group,key,pack){
  const [mime,base64]=decode(data);
  if(basename(path)!==path)throw Error('Invalid asset filename');
  const relative='assets/raw/'+group+'/'+path, dest=resolve(root,relative);
  mkdirSync(dirname(dest),{recursive:true});
  if(!existsSync(dest))writeFileSync(dest,Buffer.from(base64,'base64'));
  entries.push({key,pack,mime,path:relative});
 }
 for(const pack of packFiles){
  const obj=JSON.parse(read(pack).match(/^Object\.assign\(KW_ASSETS,(\{[\s\S]*\})\);\s*$/)[1]);
  for(const [key,data] of Object.entries(obj))unpack(data,key,key.endsWith('.mp3')?'audio':'images',key,pack);
 }
 const audio=JSON.parse(read(audioFile).match(/^const AUDIO_ASSETS\s*=\s*(\{[\s\S]*\});\s*$/)[1]);
 for(const [group,obj] of Object.entries(audio))for(const [key,data] of Object.entries(obj))unpack(data,'host-'+group+'-'+key+'.mp3','audio',group+'/'+key,audioFile);
 writeFileSync(manifestPath,JSON.stringify(entries,null,2)+'\n');
 console.log('Extracted '+entries.length+' source assets into assets/raw (existing files preserved).');
}else{
 const entries=JSON.parse(read('assets/raw/manifest.json'));
 const data=e=>'data:'+e.mime+';base64,'+readFileSync(resolve(root,e.path)).toString('base64');
 for(const pack of packFiles){
  const obj=Object.fromEntries(entries.filter(e=>e.pack===pack).map(e=>[e.key,data(e)]));
  const content='Object.assign(KW_ASSETS,'+JSON.stringify(obj)+');';
  writeFileSync(resolve(root,pack),content);
 }
 const audio={};for(const e of entries.filter(e=>e.pack===audioFile)){const [g,k]=e.key.split('/');(audio[g]??={})[k]=data(e)}
 writeFileSync(resolve(root,audioFile),'const AUDIO_ASSETS = '+JSON.stringify(audio)+';\n');
 console.log('Repacked assets; run npm run check and commit changes.');
}
