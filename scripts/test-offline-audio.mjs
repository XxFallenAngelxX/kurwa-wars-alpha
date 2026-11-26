import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script,createContext} from 'node:vm';

const root=new URL('../',import.meta.url),handlers={},entries=new Map();
const cache={async match(key){return entries.get(String(key))?.clone()},async put(key,response){entries.set(String(key),response.clone())}};
let online=true;
const base='https://example.test/game/';
const context=createContext({URL,Request,Response,Headers,Promise,Array,Number,String,Math,Error,importScripts(){},
 self:{registration:{scope:base},skipWaiting:async()=>{},clients:{claim:async()=>{}},addEventListener(type,fn){(handlers[type]??=[]).push(fn)}},
 caches:{open:async()=>cache,keys:async()=>[]},
 fetch:async url=>{if(!online)throw Error('offline');const path=new URL(url).pathname.slice('/game/'.length);return new Response(await readFile(new URL(path,root)),{headers:{'Content-Type':path.endsWith('.mp3')?'audio/mpeg':'application/octet-stream'}})}
});
new Script(await readFile(new URL('sw.js',root),'utf8')).runInContext(context);
let install;handlers.install[0]({waitUntil(p){install=p}});await install;
assert.equal(entries.size,50,'All audio files must be cached during installation');
online=false;
async function request(path,range){let result;const req=new Request(new URL(path,base),range?{headers:{Range:range}}:undefined);for(const handler of handlers.fetch)handler({request:req,respondWith(p){assert(!result,'Multiple fetch handlers responded');result=p},waitUntil(){}});return await result}
const track='assets/audio/music/Kurwa Wars - Rise of the Underground.mp3';
const full=await request(track);assert.equal(full.status,200);const bytes=new Uint8Array(await full.arrayBuffer());
const partial=await request(track,'bytes=10-29');assert.equal(partial.status,206);assert.equal(partial.headers.get('content-range'),`bytes 10-29/${bytes.length}`);assert.deepEqual(new Uint8Array(await partial.arrayBuffer()),bytes.slice(10,30));
const suffix=await request(track,'bytes=-8');assert.deepEqual(new Uint8Array(await suffix.arrayBuffer()),bytes.slice(-8));
assert.equal((await request(track,`bytes=${bytes.length}-`)).status,416);
assert.equal((await request('assets/audio/voice/shouts-v3/00.mp3')).status,200);
assert.equal((await request('assets/audio/sfx/click1.ogg')).status,200);
console.log('OK: 50 offline audio files, full and partial requests, suffix and invalid range');
