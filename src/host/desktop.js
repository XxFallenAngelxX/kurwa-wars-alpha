(() => {
  const css = `
#app { -webkit-user-select:none; user-select:none; }
#app input,#app textarea,#app [contenteditable=true] { -webkit-user-select:text; user-select:text; }
#app img { -webkit-user-drag:none; }
.worldViewport { -webkit-user-select:none; user-select:none; }
.worldViewport:focus-visible { outline:2px solid #ffe6a5; outline-offset:-2px; }
@media (any-pointer:fine) { .worldViewport {cursor:grab} .worldViewport.kwDragging,.worldViewport.kwDragging * {cursor:grabbing!important} #app button:not(:disabled){cursor:pointer} }
@media (min-width:800px) {
 #app {max-width:1440px;width:100%;height:100dvh;grid-template-rows:68px minmax(0,1fr) 68px;}
 #app>header {grid-template-columns:90px minmax(0,1fr) 48px 48px;gap:10px;padding:8px 16px;}
 #app>header #res {font-size:16px;} #app>header img{height:50px}
 #app .settings51Btn,#app .shop52Btn {width:48px;height:48px;}
 #app main {padding:12px 16px;gap:9px;overflow-y:auto;}
 #app h2{font-size:23px} #nav{gap:8px;padding:6px 16px} #nav button{font-size:13px} #nav span{font-size:22px}
 #app main:has(>.hero) {display:grid;grid-template-columns:minmax(300px,1fr) minmax(320px,1.1fr);grid-template-rows:auto auto minmax(180px,1fr) auto auto;align-items:stretch;}
 #app main:has(>.hero)>h2{grid-column:1/-1;grid-row:1;}
 #app main:has(>.hero)>.hero{grid-column:1;grid-row:2/4;min-height:250px;grid-template-columns:minmax(65px,1fr) minmax(0,2.2fr) minmax(65px,1fr);}
 #app main:has(>.hero)>.stats{grid-column:1;grid-row:4;}
 #app main:has(>.hero)>.baghead{grid-column:2;grid-row:2;}
 #app main:has(>.hero)>.baggrid{grid-column:2;grid-row:3/5;min-height:220px;max-height:none;}
 #app main:has(>.hero)>.badgeStrip{grid-column:1/-1;grid-row:5;}
 #app main:has(>.hero)>.toast{grid-column:1/-1;}
 #app .gearpair .slot{max-width:106px;} #app .gearpair label{font-size:12px;line-height:15px;}
 #app .stat{font-size:13px;min-height:34px;grid-template-columns:minmax(0,1fr) auto minmax(48px,auto);} #app .stat button{min-height:30px;font-size:12px;} #app .summary{font-size:13px;}
 #app .baggrid .slot img{object-fit:contain;} #app .baghead{font-size:14px;} #app .slot .il,#app .slot .rank{font-size:12px;}
 #app .worldViewport{flex:1;min-height:240px;} #app .world45Strip{height:100%;aspect-ratio:3/1;min-width:100%;} #app .world45Pin{font-size:13px;} #app .world45Npc span{font-size:13px;}
 #app .sheet{max-width:560px;} #app .kwChatSheet{max-width:760px;} #app .fightart{height:clamp(120px,34dvh,360px);max-height:70%;} #app .fighter .name{font-size:16px;}
 #app .settings51Panel{max-width:850px;width:100%;align-self:center;}
}
@media(min-width:800px) and (max-height:650px){#app main:has(>.hero){grid-template-rows:auto auto minmax(120px,1fr) auto auto;} #app main:has(>.hero)>.hero{min-height:180px;} #app main:has(>.hero)>.baggrid{min-height:180px;}}
`;
  const ambientCSS=`
.world45Strip>.kwAmbient{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:1}
.kwAmbient i{position:absolute;display:block;pointer-events:none}
.kwAmbient .lamp{width:9%;height:40%;transform:translate(-50%,-20%);background:radial-gradient(ellipse at 50% 20%,#ffd18b88,#ffad3525 38%,transparent 72%);mix-blend-mode:screen;animation:kwLamp 4s infinite alternate}
.kwAmbient .haze{width:12%;height:18%;background:radial-gradient(ellipse,#c7b6a550,transparent 70%);animation:kwHaze 8s ease-in-out infinite alternate}
.kwAmbient .dust{width:4px;height:4px;border-radius:50%;background:#f6c68b;box-shadow:0 0 5px #ffc87b;animation:kwDust 6s linear infinite}
@keyframes kwLamp{0%,19%,24%,70%,100%{opacity:.65}20%,22%{opacity:.25}72%{opacity:.9}}
@keyframes kwHaze{from{transform:translate(-15%,10%);opacity:.3}to{transform:translate(20%,-15%);opacity:.8}}
@keyframes kwDust{0%{transform:translate(0,20px);opacity:0}25%{opacity:.45}80%{opacity:.2}100%{transform:translate(22px,-35px);opacity:0}}
.kwAmbient .smoke{width:4%;height:12%;border-radius:50%;background:radial-gradient(ellipse,#b9b4ad70,transparent 68%);animation:kwSmoke 5s linear infinite;transform-origin:bottom center}
.kwAmbient .neon{width:5%;height:12%;background:radial-gradient(ellipse,#bd65f666,transparent 72%);animation:kwNeon 3s ease-in-out infinite alternate}
@keyframes kwSmoke{0%{transform:translate(-50%,0) scale(.35);opacity:0}15%{opacity:.75}65%{opacity:.4}100%{transform:translate(30%,-180%) scale(2.2);opacity:0}}
@keyframes kwNeon{from{opacity:.25;transform:scale(.8)}to{opacity:.85;transform:scale(1.2)}}
@media(prefers-reduced-motion:reduce){.kwAmbient i{animation:none!important}.kwAmbient .dust{display:none}}
`;
  const ambientStyle=document.createElement('style');ambientStyle.textContent=ambientCSS;document.head.append(ambientStyle);
  function ambient(strip){if(!strip||strip.querySelector(':scope > .kwAmbient'))return;const layer=document.createElement('div');layer.className='kwAmbient';layer.setAttribute('aria-hidden','true');const add=(kind,x,y,delay)=>{const e=document.createElement('i');e.className=kind;e.style.cssText='left:'+x+'%;top:'+y+'%;animation-delay:'+delay+'s';layer.append(e)};[[8,22],[29,19],[43,18],[65,17],[77,23],[91,20]].forEach(([x,y],i)=>add('lamp',x,y,-i*1.7));[[18,68],[48,74],[80,70]].forEach(([x,y],i)=>add('haze',x,y,-i*3));[[28,73],[46,65],[70,77],[91,69]].forEach(([x,y],i)=>{for(let j=0;j<4;j++)add('smoke',x,y,-j*1.25-i*.4)});add('neon',76,30,-1);for(let i=0;i<20;i++)add('dust',3+i*4.8,45+(i*17)%38,-i*.7);strip.prepend(layer)}
  const style=document.createElement('style');style.textContent=css;document.head.append(style);
  const mount=document.getElementById('mount');
  const world=()=>mount.querySelector('.worldViewport');
  function enhance(){const el=world();if(!el)return;ambient(el.querySelector('.world45Strip'));el.tabIndex=0;const hint=el.nextElementSibling;if(hint?.classList.contains('worldHint')||hint?.classList.contains('sceneHint')){if(matchMedia('(any-pointer:fine)').matches){const l=document.documentElement.lang;const msg=l==='ru'?'Перетаскивание мышью · колесо · ← →':l==='en'?'Drag with mouse · wheel · ← →':'Maus ziehen · Mausrad · ← →';if(hint.textContent!==msg)hint.textContent=msg;}}}
  let drag=null, suppressUntil=0;
  mount.addEventListener('pointerdown',e=>{const el=e.target.closest('.worldViewport');if(!el||e.pointerType==='touch'||e.button!==0||!e.isPrimary)return; if(e.target.closest('input,select,textarea'))return;suppressUntil=0;const r=el.getBoundingClientRect();if(e.clientY>=r.top+el.clientHeight&&e.clientY<=r.bottom)return;drag={el,id:e.pointerId,x:e.clientX,y:e.clientY,left:el.scrollLeft,moved:false};},true);
  document.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;if(!(e.buttons&1)){finish();return;}const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<6)return;if(!drag.moved){drag.moved=true;drag.el.classList.add('kwDragging');try{drag.el.setPointerCapture(e.pointerId)}catch{}window.getSelection()?.removeAllRanges();}drag.el.scrollLeft=drag.left-dx;e.preventDefault();},{capture:true,passive:false});
  function finish(){if(!drag)return;const d=drag;drag=null;d.el.classList.remove('kwDragging');if(d.moved){suppressUntil=performance.now()+350;try{if(d.el.hasPointerCapture(d.id))d.el.releasePointerCapture(d.id)}catch{}}}
  document.addEventListener('pointerup',finish,true);document.addEventListener('pointercancel',finish,true);window.addEventListener('blur',finish);
  mount.addEventListener('click',e=>{if(performance.now()<suppressUntil&&e.target.closest('.worldViewport')){e.preventDefault();e.stopImmediatePropagation();suppressUntil=0;}},true);
  mount.addEventListener('dragstart',e=>{if(e.target.closest('#app'))e.preventDefault();},true);
  mount.addEventListener('wheel',e=>{const el=e.target.closest('.worldViewport');if(!el||e.ctrlKey||Math.abs(e.deltaX)>=Math.abs(e.deltaY)||el.scrollWidth<=el.clientWidth)return;const unit=e.deltaMode===1?18:e.deltaMode===2?el.clientWidth:1;el.scrollLeft+=e.deltaY*unit;e.preventDefault();},{passive:false});
  mount.addEventListener('keydown',e=>{const el=e.target.closest('.worldViewport');if(!el||!['ArrowLeft','ArrowRight'].includes(e.key)||e.altKey||e.ctrlKey||e.metaKey)return;el.scrollLeft+=(e.key==='ArrowRight'?1:-1)*Math.max(80,el.clientWidth*.4);e.preventDefault();});
  new MutationObserver(enhance).observe(mount,{childList:true,subtree:true});enhance();
})();
