// Network-first HTML and mutable layout; versioned assets cache-first.
const CACHE='kwars-web-modular-v060-fast-1-'+self.registration.scope;
const root=new URL(self.registration.scope);
self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
 const req=e.request,u=new URL(req.url);if(req.method!=='GET'||u.origin!==root.origin||!u.href.startsWith(root.href))return;
 const path=u.pathname.slice(root.pathname.length);
 const navigation=req.mode==='navigate'||path===''||path==='index.html'||path==='gm.html';
 const versioned=!!u.searchParams.get('v')&&path!=='world-layout.js';
 const key=navigation?new URL(path==='gm.html'?'gm.html':'index.html',root).href:req.url;
 e.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const cached=await cache.match(key);
  if(versioned&&!navigation&&cached)return cached;
  try{
   const response=await fetch(req,{cache:navigation||path==='world-layout.js'?'no-cache':'default'});
   if(response.ok){try{await cache.put(key,response.clone())}catch{}return response}
   return cached||response;
  }catch{return cached||Response.error()}
 })());
});
