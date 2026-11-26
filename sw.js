const CACHE='kwars-web-modular-v057-1-'+self.registration.scope;
const FILES=[
  "./index.html",
  "./gm.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./src/styles/shell.css",
  "./assets/audio/host-audio.js",
  "./src/host/npc-dialogue.js",
  "./src/host/audio.js",
  "./assets/registry.js",
  "./assets/packs/assets-1.js",
  "./assets/packs/assets-2.js",
  "./assets/packs/assets-3.js",
  "./assets/packs/assets-4.js",
  "./world-layout.js",
  "./src/host/gm-access.js",
  "./generated/engine-template.js",
  "./src/host/engine-bridge.js",
  "./src/host/browser-ui.js",
  "./src/host/register-sw.js",
  "./src/host/desktop.js"
];
const absolute=p=>new URL(p,self.registration.scope).href;
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(f=>new Request(absolute(f),{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('kwars-web-')&&k.endsWith(self.registration.scope)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin||!e.request.url.startsWith(self.registration.scope))return;
 const u=new URL(e.request.url), root=new URL(self.registration.scope);
 const path=u.pathname.slice(root.pathname.length);
 const entry=path===''||path==='index.html'?'index.html':path==='gm.html'?'gm.html':path;
 const key=absolute(entry);
 e.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   const response=await fetch(e.request,{cache:'no-cache'});
   if(response.ok){try{await cache.put(key,response.clone())}catch{}return response}
   return (await cache.match(key))||response;
  }catch{return (await cache.match(key))||Response.error()}
 })());
});
