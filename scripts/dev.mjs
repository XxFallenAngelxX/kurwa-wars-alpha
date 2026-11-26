import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,relative,isAbsolute,extname} from 'node:path';
import {root,generated} from './engine-build.mjs';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg'};
const server=createServer(async(req,res)=>{
 try{
  let pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  if(pathname==='/')pathname='/index.html';
  const file=resolve(root,'.'+pathname), rel=relative(root,file);
  if(rel==='..'||rel.startsWith('..'+(process.platform==='win32'?'\\':'/'))||isAbsolute(rel)){res.writeHead(403).end();return}
  const data=pathname==='/generated/engine-template.js'?generated():await readFile(file);
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
 }catch(e){res.writeHead(e.code==='ENOENT'?404:500,{'Content-Type':'text/plain; charset=utf-8'});res.end(e.code==='ENOENT'?'Not found':String(e.message))}
});
server.listen(8080,'127.0.0.1',()=>console.log('Spiel: http://127.0.0.1:8080/\nGM: http://127.0.0.1:8080/gm.html'));
