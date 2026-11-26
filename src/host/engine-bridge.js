
const kwMemory={};let kwStorageOK=true;try{localStorage.setItem('__kw_probe','1');localStorage.removeItem('__kw_probe')}catch(e){kwStorageOK=false}
window.kwLocalStore={getItem(k){try{return kwStorageOK?localStorage.getItem(k):kwMemory[k]??null}catch{return null}},setItem(k,v){if(kwStorageOK)localStorage.setItem(k,String(v));else kwMemory[k]=String(v)},removeItem(k){if(kwStorageOK)localStorage.removeItem(k);else delete kwMemory[k]}};
const kwFrame=document.createElement('iframe');kwFrame.setAttribute('aria-hidden','true');kwFrame.tabIndex=-1;kwFrame.style.cssText='position:fixed;left:-10000px;top:0;width:390px;height:760px;visibility:hidden;border:0;pointer-events:none';
const kwUrls={};let kwBootGeneration=0;
const kwYield=()=>new Promise(resolve=>setTimeout(resolve,0));
async function kwAssets(t){
 if(typeof t!=='string'||typeof KW_ASSETS==='undefined')throw Error('Spieldaten fehlen: Engine oder Asset-Registry.');
 const keys=[...new Set(Array.from(t.matchAll(/@@LOCAL:([^@]+)@@/g),m=>m[1]))];
 const missing=keys.filter(k=>typeof KW_ASSETS[k]!=='string'||!KW_ASSETS[k].startsWith('data:'));
 if(missing.length)throw Error('Spieldaten unvollständig: '+missing.length+' Asset(s) fehlen ('+missing.slice(0,3).join(', ')+'). Bitte neu laden.');
 let stamp=performance.now();
 for(let i=0;i<keys.length;i++){
  const k=keys[i],raw=KW_ASSETS[k];
  if(!k.endsWith('.mp3')&&!kwUrls[k]){const s=atob(raw.slice(raw.indexOf(',')+1)),a=new Uint8Array(s.length);for(let j=0;j<s.length;j++)a[j]=s.charCodeAt(j);kwUrls[k]=URL.createObjectURL(new Blob([a],{type:raw.slice(5,raw.indexOf(';'))}))}
  if(performance.now()-stamp>12||i===keys.length-1){window.kwBoot?.stage('Grafiken und Spieldaten '+(i+1)+'/'+keys.length,65+22*(i+1)/Math.max(1,keys.length));await kwYield();stamp=performance.now()}
 }
 return t.replace(/@@LOCAL:([^@]+)@@/g,(_,k)=>k.endsWith('.mp3')?KW_ASSETS[k]:kwUrls[k]);
}
async function kwStartEngine(){
 const generation=++kwBootGeneration;
 window.kwBoot?.stage('Spieldaten prüfen …',65);await kwYield();
 const html=await kwAssets(KW_TEMPLATE);
 if(generation!==kwBootGeneration)throw Error('Start durch Profilwechsel ersetzt.');
 window.kwBoot?.stage('Spielkern initialisieren …',90);
 return new Promise((resolve,reject)=>{
  let done=false;
  const finish=(error)=>{if(done)return;done=true;clearTimeout(timer);if(error)reject(Error(error));else resolve()};
  const timer=setTimeout(()=>finish('Spielkern antwortet nicht. Bitte erneut versuchen.'),45000);
  window.kwFrameBoot=(id,phase,message)=>{if(id!==generation||id!==kwBootGeneration)return;if(phase==='error'){finish('Spielkern: '+message);return}if(phase==='ready')finish()};
  const pre='<script>window.addEventListener("error",function(e){if(e.message)parent.kwFrameBoot('+generation+',"error",e.message)});window.addEventListener("unhandledrejection",function(e){parent.kwFrameBoot('+generation+',"error",String(e.reason&&e.reason.message||e.reason))});<\/script>';
  const post='<script>if(typeof window.__snapshot==="function"&&typeof window.__act==="function"&&typeof window.__checkpoint==="function"&&document.querySelector("#screen")?.children.length){parent.kwFrameBoot('+generation+',"ready")}else{parent.kwFrameBoot('+generation+',"error","Startsequenz unvollständig")}<\/script>';
  kwFrame.onload=()=>{if(done||generation!==kwBootGeneration)return;try{const w=kwFrame.contentWindow;if(typeof w.__snapshot==='function'&&typeof w.__checkpoint==='function'&&w.document.querySelector('#screen')?.children.length)finish()}catch(e){finish(e.message)}};
  try{kwFrame.srcdoc=html.replace('<head>','<head>'+pre).replace('</body>',()=>post+'</body>');if(!kwFrame.isConnected)document.body.appendChild(kwFrame)}catch(e){finish(e.message)}
 });
}
let kwReady=kwStartEngine();kwReady.catch(()=>{});
window.localAudioStatus=()=>AudioGame.status();
let kwStyles=false,kwMarkup='',kwEtag=0;window.kwSwitchProfile=()=>setTimeout(()=>{kwStyles=false;kwMarkup='';kwReady=kwStartEngine();kwReady.then(()=>send('/api/game/view')).catch(e=>{err(e.message);window.kwBoot?.fail(e.message)})},0);
async function localApi(path,data){await kwReady;let w=kwFrame.contentWindow;if(path==='/api/me')return {account:true,csrf:'local'};let result={};if(path==='/api/game/action')result=w.__act(data.token,data.value,data.confirmed);let x=w.__snapshot();if(x.markup!==kwMarkup){kwMarkup=x.markup;kwEtag++}else if(data?.etag===String(kwEtag))delete x.markup;x.etag=String(kwEtag);if(!kwStyles){x.styles=Array.from(w.document.querySelectorAll('style'),e=>e.textContent).join('\n');kwStyles=true;}x.result=result;return x;}
