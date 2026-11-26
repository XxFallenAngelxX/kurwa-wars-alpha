// Nonblocking image packs; keep stable placeholders in the hidden game engine.
const kwAssetPrefix='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7#kwasset-';
const kwAssetMarker=/data:image\/gif;base64,R0lGODlhAQABAIAAAAAAAP\/\/\/yH5BAEAAAAALAAAAAABAAEAAAIBRAA7#kwasset-([A-Za-z0-9_.-]+)/g;
const kwVisibleUrls=new Map(),kwAssetRequests=new Map();
let kwAssetRevision=0,kwPacksStarted=false;
function kwLoadScript(path){
 if(kwAssetRequests.has(path))return kwAssetRequests.get(path);
 const promise=new Promise((resolve,reject)=>{
  const el=document.createElement('script');el.async=true;el.src=new URL(path,document.baseURI).href;
  el.onload=()=>resolve();el.onerror=()=>{el.remove();reject(Error('Datei fehlt: '+path))};
  document.head.appendChild(el);
 });
 kwAssetRequests.set(path,promise);promise.catch(()=>kwAssetRequests.delete(path));return promise;
}
function kwAssetPlaceholder(key){return key.endsWith('.mp3')?'data:audio/mp3;base64,':kwAssetPrefix+key}
function kwResolveAssets(text){
 if(typeof text!=='string')return text;
 return text.replace(kwAssetMarker,(marker,key)=>{
  const raw=KW_ASSETS[key];if(typeof raw!=='string')return marker;
  if(!kwVisibleUrls.has(key)){
   try{const split=raw.indexOf(','),type=raw.slice(5,raw.indexOf(';')),s=atob(raw.slice(split+1)),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);kwVisibleUrls.set(key,URL.createObjectURL(new Blob([a],{type})))}catch(e){console.warn('Asset '+key,e);return marker}
  }
  return kwVisibleUrls.get(key);
 });
}
const kwPackPaths=['./assets/packs/assets-1.js?v=3add310b','./assets/packs/assets-2.js?v=3c86bbb7','./assets/packs/assets-3.js?v=10339193','./assets/packs/assets-4.js?v=46fb394a'];
function kwStartAssetPacks(){
 if(kwPacksStarted)return;kwPacksStarted=true;
 const notice=document.getElementById('kwAssetNotice');if(notice){notice.hidden=false;notice.textContent='Grafiken werden nachgeladen …'}
 setTimeout(async()=>{
  let loaded=0;const results=await Promise.allSettled(kwPackPaths.map(path=>kwLoadScript(path).then(()=>{kwAssetRevision++;loaded++;if(notice)notice.textContent='Grafiken '+loaded+'/4 geladen …'})));
  if(notice){if(results.every(x=>x.status==='fulfilled'))notice.hidden=true;else{notice.textContent='Einige Grafiken fehlen – zum Wiederholen antippen.';notice.onclick=()=>{notice.onclick=null;kwPacksStarted=false;kwStartAssetPacks()}}}
 },0);
}
window.kwLoadHostAudio=()=>typeof AUDIO_ASSETS!=='undefined'?Promise.resolve():kwLoadScript('./assets/audio/host-audio.js?v=f8eeb461');
