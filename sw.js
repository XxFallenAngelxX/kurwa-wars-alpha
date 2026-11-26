// Mutable code is network-first. Immutable graphics keep their cache across releases.
const root=new URL(self.registration.scope);
const CACHE='kwars-web-modular-v0611-'+root.href;
const ASSETS='kwars-immutable-packs-'+root.href;
self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
 if(e.request.headers.has('range')||/\.mp3$/i.test(new URL(e.request.url).pathname))return;
 const req=e.request,u=new URL(req.url);
 if(req.method!=='GET'||u.origin!==root.origin||!u.href.startsWith(root.href))return;
 const path=u.pathname.slice(root.pathname.length);
 const navigation=req.mode==='navigate'||path===''||path==='index.html'||path==='gm.html';
 const immutable=/^assets\/packs\/assets-[1-4]\.js$/.test(path)&&!!u.searchParams.get('v');
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
