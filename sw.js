const CACHE='kwars-web-v056-gm1-'+self.registration.scope;
const FILES=["./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png","./assets-1.js","./assets-2.js","./assets-3.js","./assets-4.js","./desktop53.js","./gm-access.js","./world-layout.js"];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('kwars-web-')&&k.endsWith(self.registration.scope)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin||!e.request.url.startsWith(self.registration.scope))return;
 const path=new URL(e.request.url).pathname;
 if(e.request.mode==='navigate'||path.endsWith('/world-layout.js')||path.endsWith('/gm-access.js')){
  const key=e.request.mode==='navigate'?'./index.html':path.endsWith('/world-layout.js')?'./world-layout.js':'./gm-access.js';
  e.respondWith(fetch(e.request,{cache:'no-cache'}).then(async r=>{if(r.ok){try{const c=await caches.open(CACHE);await c.put(key,r.clone())}catch{}return r}return (await caches.open(CACHE)).match(key).then(x=>x||r)}).catch(async()=>{const c=await caches.open(CACHE);return (await c.match(key))||Response.error()}));return;
 }
 e.respondWith(caches.open(CACHE).then(c=>c.match(e.request)).then(r=>r||fetch(e.request)));
});