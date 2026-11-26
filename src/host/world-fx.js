(()=> {
'use strict';
const css=`
.world45Strip>.kwAmbient{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:1}
.kwAmbient i{position:absolute;display:block;pointer-events:none}
.kwAmbient .kwLight{width:var(--w);height:var(--h);transform:translate(-50%,-32%);background:radial-gradient(ellipse at 50% 30%,#fff0bfaa 0%,#ffbf5366 19%,#f59c3428 45%,transparent 73%);mix-blend-mode:screen;animation:kwLightPower var(--duration) linear infinite}
.kwAmbient .kwCore{width:calc(var(--w)*.2);height:calc(var(--h)*.16);transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(ellipse,#fff4c7d9,#ffc35877 40%,transparent 75%);mix-blend-mode:screen;animation:kwLightPower var(--duration) linear infinite}
@keyframes kwLightPower{0%,100%{opacity:.78}15%,46%{opacity:1}19%,49%{opacity:.61}65%{opacity:.9}82%{opacity:.73}}
.kwAmbient .kwVapor{width:5%;height:13%;border-radius:50%;background:radial-gradient(ellipse,#c9c7bd75,#aaa9a733 35%,transparent 71%);animation:kwVaporFlow 6s linear infinite}
@keyframes kwVaporFlow{0%{transform:translate(-50%,0) scale(.3,.35);opacity:0}18%{opacity:.72}50%{transform:translate(-10%,-100%) scale(1.05,.9);opacity:.52}100%{transform:translate(55%,-240%) scale(1.9,1.6);opacity:0}}
.kwAmbient .kwMote{width:3px;height:3px;background:#ffe0a1;border-radius:50%;box-shadow:0 0 4px #ffbb65;animation:kwMoteDrift 8s linear infinite}
@keyframes kwMoteDrift{0%{transform:translate(0,20px);opacity:0}22%{opacity:.5}78%{opacity:.35}100%{transform:translate(32px,-65px);opacity:0}}
.world45Npc>img{transform-origin:50% 94%;animation:kwNpcIdle 3.8s ease-in-out infinite}
.world45Npc[data-map-id="mopo"]>img{animation-name:kwNpcMopo;animation-duration:4.7s;animation-delay:-1.8s}
.world45Npc[data-map-id="miau"]>img{animation-duration:3.2s;animation-delay:-.9s}
.world45Npc[data-map-id="babu"]>img{animation-duration:5.2s;animation-delay:-2.3s}
.world45Npc[data-map-id="pfand"]>img{animation-name:kwNpcMopo;animation-duration:4.1s;animation-delay:-.4s}
@keyframes kwNpcIdle{0%,100%{transform:scale(1,1)}25%{transform:scale(1.015,1.025) rotate(-.65deg)}50%{transform:scale(1.008,1.04)}75%{transform:scale(.997,1.015) rotate(.65deg)}}
@keyframes kwNpcMopo{0%,100%{transform:rotate(-.8deg) scale(1,1)}50%{transform:rotate(.8deg) scale(1.015,1.035)}}
.world45Npc:active>img{animation-play-state:paused}
@media(prefers-reduced-motion:reduce){.kwAmbient i,.world45Npc>img{animation:none!important}.kwAmbient .kwVapor,.kwAmbient .kwMote{display:none}}
`;
const style=document.createElement('style');style.textContent=css;document.head.append(style);
const mount=document.getElementById('mount');if(!mount)return;
const detected=new Map();
function scanLights(url){
 if(detected.has(url))return detected.get(url);
 const promise=new Promise(resolve=>{const im=new Image();im.onload=()=>{try{
 const w=384,h=128,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const g=canvas.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0,w,h);const d=g.getImageData(0,0,w,h).data;
 const lum=(x,y)=>{const k=(y*w+x)*4;return .299*d[k]+.587*d[k+1]+.114*d[k+2]};
 const candidates=[];
 for(let y=9;y<82;y+=2)for(let x=5;x<w-5;x+=2){const k=(y*w+x)*4,r=d[k],green=d[k+1],b=d[k+2],l=lum(x,y);if(l<145||r<180||green<95||r<b+20||green<b+5)continue;
 let outer=0;for(const [dx,dy] of [[-5,-5],[5,-5],[-5,5],[5,5],[0,-7],[0,7]])outer+=lum(x+dx,y+dy);outer/=6;const contrast=l-outer;if(contrast<26)continue;
 candidates.push({x:x/w*100,y:y/h*100,score:contrast+(l-145)*.3});
 }
 candidates.sort((a,b)=>b.score-a.score);const points=[];for(const p of candidates){if(points.some(q=>Math.hypot((p.x-q.x)*3,p.y-q.y)<10))continue;points.push(p);if(points.length===9)break}resolve(points);
 }catch(e){console.warn('World FX light scan',e);resolve([])}};im.onerror=()=>resolve([]);im.src=url});
 detected.set(url,promise);return promise;
}
function add(layer,kind,x,y,delay,extra=''){const el=document.createElement('i');el.className=kind;el.style.cssText='left:'+x+'%;top:'+y+'%;animation-delay:'+(-performance.now()/1000+delay)+'s;'+extra;layer.append(el)}
function update(){const strip=mount.querySelector('.world45Strip');if(!strip)return;let layer=strip.querySelector(':scope > .kwAmbient');if(!layer){layer=document.createElement('div');layer.className='kwAmbient';layer.setAttribute('aria-hidden','true');strip.prepend(layer);
 for(const [x,y] of [[28,79],[70,83],[92,76]])for(let j=0;j<4;j++)add(layer,'kwVapor',x,y,-j*1.5);
 for(let j=0;j<16;j++)add(layer,'kwMote',4+j*6,42+(j*17)%42,-j*.8);
 }
 const bg=strip.style.backgroundImage;const m=bg.match(/^url\(["']?(.*?)["']?\)$/);const url=m?.[1];if(!url||url.includes('#kwasset-')||layer.dataset.lightSource===url)return;layer.dataset.lightSource=url;
 scanLights(url).then(points=>{if(!layer.isConnected||layer.dataset.lightSource!==url)return;layer.querySelectorAll('.kwLight,.kwCore').forEach(n=>n.remove());points.forEach((p,i)=>{const extra='--w:7%;--h:37%;--duration:'+(3.4+i*.61)+'s;';add(layer,'kwLight',p.x,p.y,-i*.77,extra);add(layer,'kwCore',p.x,p.y,-i*.77,extra)})});
}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;update()})}
new MutationObserver(schedule).observe(mount,{childList:true,subtree:true,attributes:true,attributeFilter:['style']});schedule();
})();
