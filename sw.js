// Persistent kiosk dialogue release; existing update handling unchanged.
// Mutable code is network-first. Immutable graphics keep their cache across releases.
importScripts('./generated/sw-version.js');
const root=new URL(self.registration.scope);
const CACHE='kwars-web-modular-v0619-art-'+root.href;
const ASSETS='kwars-immutable-packs-'+root.href;
const AUDIO='kwars-offline-audio-v1-'+root.href;
const audioFiles=[
 'assets/audio/music/Kurwa Wars - Rise of the Underground.mp3',
 'assets/audio/music/Kurwa Wars - Unnamed song.mp3',
 'assets/audio/voice/shouts-v3/manifest.json',
 ...Array.from({length:14},(_,i)=>`assets/audio/voice/shouts-v3/${String(i).padStart(2,'0')}.mp3`),
 ...['click1','click2','mouseclick1','switch1','switch2','switch3','switch_001','switch_002','switch_003','switch4','switch5','back_001','back_002','open_001','open_002','close_001','close_002','drop_001','drop_002','impactPunch_medium_001','impactPunch_medium_003','impactSoft_heavy_001','impactSoft_heavy_003','impactPunch_heavy_001','impactPunch_heavy_003','impactMetal_light_001','impactMetal_light_003','impactWood_heavy_001','impactWood_heavy_003','switch6','switch7','impactGeneric_light_001','impactGeneric_light_003'].map(name=>'assets/audio/sfx/'+name+'.ogg')
];
self.addEventListener('install',e=>e.waitUntil((async()=>{
 const cache=await caches.open(AUDIO);
 await Promise.allSettled(audioFiles.map(async path=>{
  const url=new URL(path,root).href;
  if(await cache.match(url))return;
  const response=await fetch(url);
  if(!response.ok)throw Error('Audio HTTP '+response.status);
  await cache.put(url,response);
 }));
 await self.skipWaiting();
})()));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
 const req=e.request,u=new URL(req.url);
 if(req.method!=='GET'||u.origin!==root.origin||!u.href.startsWith(root.href)||!u.pathname.slice(root.pathname.length).startsWith('assets/audio/'))return;
 e.respondWith((async()=>{
  const cache=await caches.open(AUDIO),key=new URL(u.href);key.hash='';
  let response=await cache.match(key.href);
  if(!response){
   try{response=await fetch(key.href);if(response.ok&&response.status===200)await cache.put(key.href,response.clone())}catch{return Response.error()}
  }
  const range=req.headers.get('range');if(!range||!response.ok)return response;
  const match=/^bytes=(\d*)-(\d*)$/i.exec(range);if(!match||(!match[1]&&!match[2]))return new Response(null,{status:416});
  const bytes=await response.arrayBuffer(),size=bytes.byteLength;
  let start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
  let end=match[1]&&match[2]?Number(match[2]):size-1;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=size||end<start)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
  end=Math.min(end,size-1);
  const headers=new Headers(response.headers);headers.set('Content-Range',`bytes ${start}-${end}/${size}`);headers.set('Content-Length',String(end-start+1));headers.set('Accept-Ranges','bytes');
  return new Response(bytes.slice(start,end+1),{status:206,statusText:'Partial Content',headers});
 })());
});
self.addEventListener('fetch',e=>{
 const req=e.request,u=new URL(req.url);
 if(req.method!=='GET'||u.origin!==root.origin||!u.href.startsWith(root.href))return;
 const path=u.pathname.slice(root.pathname.length);
 if(path.startsWith('assets/audio/')||req.headers.has('range'))return;
 const navigation=req.mode==='navigate'||path===''||path==='index.html'||path==='gm.html';
 const immutable=/^assets\/packs\/assets-[1-5]\.js$/.test(path)&&!!u.searchParams.get('v');
 const force=req.cache==='reload'||req.cache==='no-store';
 const key=navigation?new URL(path==='gm.html'?'gm.html':'index.html',root).href:req.url;
 e.respondWith((async()=>{
  const cache=await caches.open(immutable?ASSETS:CACHE);
  let cached=await cache.match(key);
  if(immutable&&!force){
   if(!cached){
    const names=await caches.keys();
    for(const name of names.filter(n=>n.startsWith('kwars-web-modular-')&&n.endsWith(root.href))){
     const old=await caches.open(name);cached=await old.match(key);
     if(cached){try{await cache.put(key,cached.clone())}catch{}break}
    }
   }
   if(cached)return cached;
  }
  try{
   const response=await fetch(req,{cache:force?'reload':immutable?'default':'no-cache'});
   if(response.ok){try{const write=cache.put(key,response.clone()).catch(()=>{});e.waitUntil(write)}catch{}return response}
   return !force&&cached?cached:response;
  }catch{return !force&&cached?cached:Response.error()}
 })());
});
