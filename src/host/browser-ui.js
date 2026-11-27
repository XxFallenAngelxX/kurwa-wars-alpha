function kwComparableMarkup(old,next){if(!old.querySelector('.world45Strip'))return old.outerHTML;const copy=old.cloneNode(true);copy.querySelectorAll('.kwAmbient').forEach(e=>e.remove());const viewport=copy.querySelector('.worldViewport');if(viewport&&!next.querySelector('.worldViewport')?.hasAttribute('tabindex'))viewport.removeAttribute('tabindex');return copy.outerHTML;}

'use strict';
// Retain the connected world map when only the surrounding UI or action tokens change.
const kwWorldActionAttrs=['data-control','data-confirm','data-audio','data-portal'];
function kwWorldStableMarkup(view){
 const copy=view.cloneNode(true);
 copy.querySelectorAll('.kwAmbient').forEach(e=>e.remove());
 copy.removeAttribute('tabindex');
 copy.classList.remove('kwDragging');
 for(const el of copy.querySelectorAll('button'))for(const attr of kwWorldActionAttrs)el.removeAttribute(attr);
 return copy.outerHTML;
}
function kwPatchWorldScreen(old,next){
 if(old.id!=='screen'||next.id!=='screen')return false;
 const before=[...old.children],after=[...next.children];
 const i=before.findIndex(e=>e.matches('.worldViewport'));
 if(i<0||before.length!==after.length||!after[i].matches('.worldViewport'))return false;
 const view=before[i],incoming=after[i];
 if(!view.querySelector('.world45Strip')||!incoming.querySelector('.world45Strip')||
    kwWorldStableMarkup(view)!==kwWorldStableMarkup(incoming))return false;
 // The engine may issue fresh control tokens after an action or modal transition.
 const buttons=[...view.querySelectorAll('button')],newButtons=[...incoming.querySelectorAll('button')];
 if(buttons.length!==newButtons.length)return false;
 for(let n=0;n<buttons.length;n++)for(const attr of kwWorldActionAttrs){
  const value=newButtons[n].getAttribute(attr);
  if(value===null)buttons[n].removeAttribute(attr);
  else if(buttons[n].getAttribute(attr)!==value)buttons[n].setAttribute(attr,value);
 }
 for(const attr of [...old.attributes])if(!next.hasAttribute(attr.name))old.removeAttribute(attr.name);
 for(const attr of [...next.attributes])if(old.getAttribute(attr.name)!==attr.value)old.setAttribute(attr.name,attr.value);
 for(let n=0;n<before.length;n++)if(n!==i&&before[n].outerHTML!==after[n].outerHTML)before[n].replaceWith(after[n]);
 return true;
}

const mount=document.getElementById('mount'), status=document.getElementById('connection');let csrf='',etag='',busy=false,editing=false,queued=null,kwWorldScroll=0;
function err(t){status.hidden=!t;status.textContent=t||''}
async function api(path,data){return localApi(path,data)}
const kwVictoryQueue=[];
let kwVictoryActive=false,kwVictoryLastLine=-1;
const kwVictoryArt={closed:'./assets/codex/book-closed.webp',open:'./assets/codex/book-open.webp',page:'./assets/codex/page.webp',soul:'./assets/codex/soul.webp'};
for(const src of Object.values(kwVictoryArt)){const img=new Image();img.src=src}
function kwShowVictory(discovery){
 if(kwVictoryActive&&!discovery)return;
 const foeImg=mount.querySelector('.fighter.foe .fightart img');
 const portrait=discovery&&typeof discovery.portrait==='string'&&!discovery.portrait.includes('#kwasset-')?discovery.portrait:foeImg?.src;
 kwVictoryQueue.push(discovery?{...discovery,portrait}:null);
 if(kwVictoryActive)return;
 function play(){
  if(!kwVictoryQueue.length){kwVictoryActive=false;return}
  kwVictoryActive=true;
  const item=kwVictoryQueue.shift(),lang=document.documentElement.lang;
  const phrases=lang==='en'?['The yard is yours.','Another story for the garage.','Victory, officially approved.','The house rules have spoken.']:lang==='ru'?['Двор теперь твой.','Ещё одна история для гаража.','Победа официально одобрена.','Домовой порядок решён.']:['Der Hof gehört dir.','Eine Geschichte mehr für die Garage.','Sieg mit amtlichem Stempel.','Die Hausordnung ist zufrieden.','Der Pfand gehört dem Sieger.'];
  let next=Math.floor(Math.random()*phrases.length);
  if(next===kwVictoryLastLine)next=(next+1)%phrases.length;
  kwVictoryLastLine=next;
  const arena=mount.querySelector('.arena')?.getBoundingClientRect(),hero=mount.querySelector('#nav button:first-child')?.getBoundingClientRect(),foe=mount.querySelector('.fighter.foe .fightart')?.getBoundingClientRect();
  const player=mount.querySelector('.fighter:not(.foe) .fightart')?.getBoundingClientRect(),vs=mount.querySelector('.arena .vs')?.getBoundingClientRect();
  const gap=player&&foe?Math.max(0,foe.left-player.right):0;
  const scale=item?Math.min(.67,Math.max(.43,(gap+28||140)/280),Math.max(.35,(innerHeight-60)/300)):1;
  const x=item&&vs?vs.left+vs.width/2:arena?arena.left+arena.width/2:innerWidth/2;
  const portraitTop=Math.min(player?.top??arena?.top??0,foe?.top??arena?.top??0);
  const y=item&&arena?Math.max(8,arena.top+3,portraitTop-136*scale):arena?arena.top+Math.min(32,arena.height*.1):Math.max(12,innerHeight*.14);
  const layer=document.createElement('div'),scene=document.createElement('div');
  layer.className='kwVictoryOverlay'+(item?' hasDiscovery':'');layer.setAttribute('role','status');layer.setAttribute('aria-live','polite');
  scene.className='kwVictoryScene'+(item?' hasDiscovery':'');
  if(item){layer.style.left=x+'px';layer.style.top=y+'px';scene.style.setProperty('--kw-local-scale',scale);scene.style.left='0';scene.style.top='0';}
  else {scene.style.left=x+'px';scene.style.top=y+'px';}
  scene.style.setProperty('--kw-book-x',((hero?hero.left+hero.width/2:x)-x)+'px');
  scene.style.setProperty('--kw-book-y',((hero?hero.top+hero.height/2:innerHeight-30)-(y+160))+'px');
  scene.style.setProperty('--kw-soul-x',((foe?foe.left+foe.width/2:x+80)-x)+'px');
  scene.style.setProperty('--kw-soul-y',((foe?foe.top+foe.height/2:y+110)-(y+160))+'px');
  const headline=document.createElement('strong');headline.className='kwVictoryTitle';headline.textContent=lang==='en'?'VICTORY!':lang==='ru'?'ПОБЕДА!':'GEWONNEN!';
  const quote=document.createElement('span');quote.className='kwVictoryQuote';quote.textContent=phrases[next];
  scene.append(headline,quote);
  if(item){
   const visual=document.createElement('div');visual.className='kwCodexVisual';const halo=document.createElement('div');halo.className='kwCodexHalo';visual.append(halo);
   const closed=document.createElement('img'),open=document.createElement('img'),page=document.createElement('div'),soul=document.createElement('div'),ghost=document.createElement('img');
   closed.className='kwCodexClosed';closed.src=kwVictoryArt.closed;closed.alt='';
   open.className='kwCodexOpen';open.src=kwVictoryArt.open;open.alt='';
   page.className='kwCodexPage';page.setAttribute('aria-hidden','true');page.style.setProperty('--leaf',0);
   soul.className='kwCodexSoul';ghost.src=kwVictoryArt.soul;ghost.alt='';soul.append(ghost);
   const portrait=item.portrait;if(portrait&&!portrait.includes('#kwasset-')){const sticker=document.createElement('img'),placed=document.createElement('img');sticker.className='kwCodexSticker';sticker.src=portrait;sticker.alt='';soul.append(sticker);placed.className='kwCodexPageSticker';placed.src=portrait;placed.alt='';visual.append(placed)}
   visual.append(closed,open,page,soul);
   for(let n=1;n<4;n++){const leaf=page.cloneNode(false);leaf.style.setProperty('--leaf',n);visual.append(leaf)}
   const rays=document.createElement('div');rays.className='kwCodexRays';visual.prepend(rays);
   for(let n=0;n<24;n++){const spark=document.createElement('i');spark.className='kwCodexSpark';spark.style.setProperty('--angle',(n*15)+'deg');spark.style.setProperty('--reach',(35+(n%5)*10)+'px');spark.style.setProperty('--hue',[42,184,286,325,15,215][n%6]);visual.append(spark)}
   const ring=document.createElement('i');ring.className='kwCodexImpact';visual.append(ring);
   scene.append(visual);
   const info=document.createElement('div');info.className='kwCodexDiscovery';
   const title=document.createElement('b'),name=document.createElement('span'),progress=document.createElement('small');
   title.textContent=item.preview?(lang==='en'?'CODEX PREVIEW':lang==='ru'?'ПРОСМОТР КОДЕКСА':'KODEX-VORSCHAU'):(lang==='en'?'CODEX UPDATED':lang==='ru'?'КОДЕКС ПОПОЛНЕН':'KODEX ERWEITERT');
   name.textContent=item.name;
   progress.textContent=item.preview?(lang==='en'?'Example · no new entry':lang==='ru'?'Пример · без новой записи':'Beispiel · kein neuer Eintrag'):(lang==='en'?'Enemies ':lang==='ru'?'Противники ':'Gegner ')+item.foes+'/'+item.total+' · '+(lang==='ru'?'Кодекс':'Kodex')+' '+item.percent+' %';
   info.append(title,name,progress);scene.append(info);
  }
  layer.append(scene);document.body.append(layer);
  if(item){
   const visual=scene.querySelector('.kwCodexVisual'),r=visual.getBoundingClientRect(),css=getComputedStyle(visual);
   const ox=parseFloat(css.getPropertyValue('--kw-soul-origin-x')),oy=parseFloat(css.getPropertyValue('--kw-soul-origin-y'));
   const cx=r.left+ox*scale,cy=r.top+oy*scale;
   scene.style.setProperty('--kw-soul-x',((foe?foe.left+foe.width/2:x+70)-cx)/scale+'px');
   scene.style.setProperty('--kw-soul-y',((foe?foe.top+foe.height/2:y+60)-cy)/scale+'px');
  }
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let timer,finished=false;
  function finish(){if(finished)return;finished=true;clearTimeout(timer);mount.removeEventListener('click',dismiss,true);window.removeEventListener('resize',dismiss);document.removeEventListener('scroll',dismiss,true);layer.remove();play()}
  function dismiss(e){if(e.type==='click'&&!e.target.closest?.('button,[role="button"]'))return;kwVictoryQueue.length=0;finish()}
  if(item){mount.addEventListener('click',dismiss,true);window.addEventListener('resize',dismiss);document.addEventListener('scroll',dismiss,true)}
  timer=setTimeout(finish,reduced?2000:item?4400:2600);
 }
 play();
}
// Preserve the breathing cycle even when the combat engine replaces portrait nodes.
const kwPortraitIdleSeen=new WeakSet();
function kwSyncPortraitBreathing(){
 const clock=document.timeline?.currentTime;
 if(typeof clock!=='number')return;
 for(const img of mount.querySelectorAll('.heroart .portrait51>img,.arena .fightart:not(.fallen)>img')){
  if(typeof img.getAnimations!=='function')continue;
  for(const a of img.getAnimations()){
   if(a.animationName!=='kwPortraitBreath'||kwPortraitIdleSeen.has(a))continue;
   const duration=a.effect?.getTiming().duration;
   if(typeof duration!=='number'||duration<=0)continue;
   try{a.currentTime=clock%duration;kwPortraitIdleSeen.add(a)}catch{}
  }
 }
}
function apply(x){if(x.styles)document.getElementById('gameStyles').textContent=x.styles;if(x.lang)document.documentElement.lang=x.lang;
 if(x.markup!==undefined){let oldScreen=mount.querySelector('main'),oldHeading=oldScreen?.querySelector('h2')?.textContent;let scrolls=[...mount.querySelectorAll('.sheet,main,.raidArchive,.gmTimePanel,.hqInventory,.kwChatHistory,.kwAchievementList,.kwRankList,.baggrid')].map(e=>e.scrollTop);let details=[...mount.querySelectorAll('details')].map(e=>e.open);let worldOld=mount.querySelector('.worldViewport');if(worldOld)kwWorldScroll=worldOld.scrollLeft;if(!mount.firstElementChild||mount.firstElementChild.id!=='app'){mount.innerHTML=x.markup}else{let tmp=document.createElement('template');tmp.innerHTML=x.markup;let next=tmp.content.firstElementChild,cur=mount.firstElementChild;if(!next||next.id!=='app'){mount.innerHTML=x.markup}else{let parts=[...next.children],old=[...cur.children];if(parts.length!==old.length||parts.some((el,i)=>el.tagName!==old[i].tagName||el.id!==old[i].id)){mount.innerHTML=x.markup}else{for(let i=0;i<parts.length;i++){if(kwComparableMarkup(old[i],parts[i])!==parts[i].outerHTML&&!kwPatchWorldScreen(old[i],parts[i]))old[i].replaceWith(parts[i])}}}}let worldNew=mount.querySelector('.worldViewport');if(worldNew)worldNew.scrollLeft=kwWorldScroll;[...mount.querySelectorAll('.sheet,main,.raidArchive,.gmTimePanel,.hqInventory,.kwChatHistory,.kwAchievementList,.kwRankList,.baggrid')].forEach((e,i)=>e.scrollTop=e.matches('main,.kwAchievementList,.kwRankList')&&e.closest('main')?.querySelector('h2')?.textContent!==oldHeading?0:scrolls[i]||0);[...mount.querySelectorAll('details')].forEach((e,i)=>e.open=!!details[i]);}etag=x.etag||etag;
 kwSyncPortraitBreathing();
 try{AudioGame.scene(x.scene);const celebrations=[];for(let [k,v] of x.events||[]){if(k==='fx'||k==='voice')AudioGame[k](v);else if(k==='victory')celebrations.push({});else if(k==='codexPreview')celebrations.push({discovery:v});else if(k==='codexDiscovery'){if(celebrations.length&&!celebrations[celebrations.length-1].discovery)celebrations[celebrations.length-1].discovery=v;else celebrations.push({discovery:v});}}for(const celebration of celebrations)kwShowVictory(celebration.discovery);}catch(e){console.error('Game event error',e)}if(x.result?.portal){location.href='/';return}err(!kwStorageOK?'Browser blockiert lokale Speicherung. Spielstand bleibt nur bis zum Schließen erhalten.':x.result?.ok===false?x.result.reason:'');}
window.kwPlayCombatAttack=hit=>AudioGame.combatAttack(hit);
window.kwCombatFx=(sound,delay)=>setTimeout(()=>AudioGame.fx(sound),delay*1000);
let kwCombatViewPending=false;
window.kwRequestCombatView=function(){
 if(kwCombatViewPending||document.hidden)return;
 kwCombatViewPending=true;
 const refresh=()=>{
  if(busy){requestAnimationFrame(refresh);return;}
  kwCombatViewPending=false;
  send('/api/game/view');
 };
 requestAnimationFrame(refresh);
};
function kwTextEditing(){return !!document.activeElement?.matches('input:not([type=range]):not([type=checkbox]):not([type=radio]),textarea,select,[contenteditable="true"]')}
async function send(path,data){if(busy){if(path==='/api/game/action')queued=[path,data];return}busy=true;try{let x=await api(path,data);apply(x);if(mount.querySelector('#app'))window.kwBoot?.ready()}catch(e){kwTrace('ui.request.failed',{path});err(e.message+' – Verbindung wird erneut versucht.')}finally{busy=false;if(queued){let q=queued;queued=null;send(...q)}}}
function action(e,value,token=e.dataset.control){if(!token)return;let name=mount.querySelector('#profileInput');if(name&&e!==name)kwFrame.contentWindow.__profileDraft=name.value;let confirmed=!e.dataset.confirm||confirm('Diese Aktion wirklich ausführen?');if(!confirmed)return;send('/api/game/action',{token,...(value===undefined?{}:{value:String(value)}),confirmed,etag})}
function audioAction(e,value){let a=e.dataset.audio;if(!a)return;let m=a.match(/^AudioGame\.(toggle|unlock|fx|voice|set|voiceMode)\((?:'([^']*)')?(?:,this.value)?\)$/);if(!m)return;try{if(m[1]==='set')AudioGame.set(m[2],value);else AudioGame[m[1]](m[2]);}catch{}}
// A backdrop click is accepted only if the pointer also started on that same backdrop.
 // Inner controls, text selections, scroll gestures and mandatory dialogs stay untouched.
 function kwBackdropToken(target){return target?.matches?.('#modal:not([hidden])[data-backdrop-control]')?target.dataset.backdropControl:null}
 let kwBackdropDown=null;
 mount.addEventListener('pointerdown',ev=>{kwBackdropDown=ev.isPrimary!==false&&ev.button===0?kwBackdropToken(ev.target):null});
 mount.addEventListener('pointercancel',()=>{kwBackdropDown=null});
 mount.addEventListener('click',ev=>{
  const token=kwBackdropToken(ev.target),started=kwBackdropDown;kwBackdropDown=null;
  if(token){if(token===started){ev.preventDefault();editing=false;action(ev.target,undefined,token)}return;}
  let e=ev.target.closest('[data-control]');if(!e||e.matches('input,select')||e.disabled)return;ev.preventDefault();editing=false;audioAction(e);action(e)
 });
mount.addEventListener('focusin',ev=>{if(ev.target.matches('input,select'))editing=true});mount.addEventListener('focusout',()=>{editing=false});mount.addEventListener('pointerdown',ev=>{if(ev.target.matches('input[type=range]')||ev.target.closest('.worldViewport'))editing=true});mount.addEventListener('pointercancel',()=>{editing=false});document.addEventListener('pointerup',()=>{editing=false});
mount.addEventListener('input',ev=>{let t=ev.target;if(t.id!=='invQtyRange')return;let n=Number(t.value),max=t.max,unit=Number(t.dataset.invUnit),text=mount.querySelector('#invQtyText'),value=mount.querySelector('#invQtyValue');if(text)text.textContent=n+' / '+max;if(value)value.textContent='$'+(n*unit).toLocaleString(document.documentElement.lang==='en'?'en-US':document.documentElement.lang==='ru'?'ru-RU':'de-DE');});
mount.addEventListener('keydown',ev=>{if(ev.target.id==='warehouseSearch47'&&ev.key==='Enter'){ev.preventDefault();ev.target.blur()}});
mount.addEventListener('change',ev=>{let e=ev.target.closest('[data-control]');if(!e)return;editing=false;if(e.id==='profileInput'){kwFrame.contentWindow.__profileDraft=e.value;return}audioAction(e,e.value);action(e,e.value)});
let lastWorldScroll=0;mount.addEventListener('scroll',ev=>{if(ev.target.matches?.('.worldViewport'))lastWorldScroll=Date.now()},true);

/* v0.55 live UI: spotlight plus drag-and-drop editor, outside the replicated engine DOM. */
const kwUI55=document.createElement('div');kwUI55.id='kwUI55';document.body.append(kwUI55);
const kwStyleUI55=document.createElement('style');kwStyleUI55.textContent='#kwUI55{position:fixed;inset:0;z-index:2147483000;pointer-events:none;font:14px/1.35 system-ui,sans-serif;color:#f8e8d2}#kwUI55 [hidden]{display:none!important}.kw55Shade{position:absolute;inset:0;background:#130e18a8;pointer-events:auto}.kw55Ring{position:absolute;border:2px solid #ffd579;border-radius:8px;box-shadow:0 0 0 3px #1c151dcc,0 0 16px #ffcc7277;pointer-events:none;transition:none}.kw55Tip{position:absolute;width:min(350px,calc(100vw - 24px));box-sizing:border-box;background:#201923;border:1px solid #d7a45b;border-radius:12px;box-shadow:0 8px 30px #000a;padding:12px;pointer-events:auto;display:grid;gap:8px;max-height: min(52dvh,360px);overflow:auto}.kw55Tip h3{margin:0;font-size:17px;color:#ffe0a3}.kw55Tip p{margin:0;font-size:13px;line-height:1.4}.kw55Tip button,.kw55Editor button,.kw55Editor select,.kw55Editor input,.kw55Editor textarea{font:inherit;color:#f8e8d2;background:#382a38;border:1px solid #a77c4c;border-radius:6px;padding:7px;min-height:34px;box-sizing:border-box}.kw55Tip button.kw55Primary{background:#c18a42;color:#201923;font-weight:700}.kw55Tip .kw55Meta{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#d6b789;gap:8px}.kw55Tip .kw55Actions{display:flex;flex-wrap:wrap;gap:6px}.kw55Tip .kw55Exit{background:none;border:none;min-height:24px;padding:1px 4px;color:#d6b789}.kw55Progress{height:3px;background:#493746;border-radius:3px}.kw55Progress i{display:block;height:100%;background:#e6b76c;border-radius:3px}.kw55Editor{position:absolute;right:8px;top:70px;width:min(250px,calc(100vw - 16px));max-height:calc(100dvh - 145px);overflow:auto;pointer-events:auto;background:#211923f2;padding:9px;border:1px solid #c69a58;border-radius:9px;display:grid;gap:7px;box-shadow:0 4px 20px #0008}.kw55Editor label{display:grid;grid-template-columns:55px 1fr 38px;align-items:center;gap:4px}.kw55Editor input{width:100%;padding:0;min-height:24px}.kw55Editor select,.kw55Editor textarea{width:100%}.kw55Editor textarea{min-height:75px;user-select:text}.kw55Editor .kw55EditorRow{display:flex;gap:5px;flex-wrap:wrap}.kw55Editor small{color:#d6b789}';document.head.append(kwStyleUI55);
const kwShade55=document.createElement('div'),kwRing55=document.createElement('div'),kwTip55=document.createElement('section'),kwEditor55=document.createElement('section');kwShade55.className='kw55Shade';kwRing55.className='kw55Ring';kwTip55.className='kw55Tip';kwTip55.setAttribute('aria-label','Tutorial');kwEditor55.className='kw55Editor';for(const e of [kwShade55,kwRing55,kwTip55,kwEditor55]){e.hidden=true;kwUI55.append(e)}
let kwTourData55=null,kwTourKey55='',kwEditorData55=null,kwEditorKey55='',kwLastTarget55=null,kwDrag55=null,kwEditorExpanded55=window.innerWidth>=700;
function kwText55(tag,text,parent){const e=document.createElement(tag);e.textContent=text;parent.append(e);return e}
function kwButton55(parent,text,fn,cls=''){const e=kwText55('button',text,parent);e.type='button';e.className=cls;e.addEventListener('click',fn);return e}
async function kwCall55(method,...args){const ready=kwReady;try{await ready;for(let i=0;busy&&i<80;i++)await new Promise(r=>setTimeout(r,25));if(busy||ready!==kwReady)return;const w=kwFrame.contentWindow;if(w[method]?.(...args)!==false)await send('/api/game/view');else if(method==='__layout55')err('Placement: Aktion nicht möglich oder JSON ungültig.')}catch(e){err(e.message)}}
function kwTourPosition55(){const m=kwTourData55;if(!m||kwTip55.hidden)return;const W=window.innerWidth,H=window.innerHeight;let el=m.target?mount.querySelector(m.target):null;let r=el?.getBoundingClientRect();if(r){let a=el.closest('.worldViewport,main,.sheet');if(a&&a!==el){const b=a.getBoundingClientRect();r={left:Math.max(r.left,b.left),right:Math.min(r.right,b.right),top:Math.max(r.top,b.top),bottom:Math.min(r.bottom,b.bottom)};r.width=r.right-r.left;r.height=r.bottom-r.top}}
 const visible=r&&r.width>2&&r.height>2&&r.right>0&&r.left<W&&r.bottom>0&&r.top<H;
 kwRing55.hidden=!visible;
 if(visible){const l=Math.max(2,r.left-3),top=Math.max(2,r.top-3);Object.assign(kwRing55.style,{left:l+'px',top:top+'px',width:Math.max(0,Math.min(W-2,r.right+3)-l)+'px',height:Math.max(0,Math.min(H-2,r.bottom+3)-top)+'px'})}
 const tw=kwTip55.offsetWidth,th=kwTip55.offsetHeight;
 let x=(W-tw)/2,y=(H-th)/2;
 if(m.n!==0){if(visible){x=Math.max(8,Math.min(W-tw-8,(r.left+r.right-tw)/2));const bottom=r.bottom+10,top=r.top-th-10;if(bottom+th<=H-8)y=bottom;else if(top>=8)y=top;else if(W-r.right>=tw+12){x=r.right+8;y=Math.max(8,Math.min(H-th-8,r.top))}else if(r.left>=tw+12){x=r.left-tw-8;y=Math.max(8,Math.min(H-th-8,r.top))}else y=r.top>H/2?8:H-th-8}else y=H-th-12}
 Object.assign(kwTip55.style,{left:Math.max(8,x)+'px',top:Math.max(8,y)+'px'});
}
function kwTourDraw55(m){kwTourData55=m;if(!m){kwTip55.hidden=kwRing55.hidden=kwShade55.hidden=true;kwTourKey55='';kwLastTarget55=null;return}
 const key=JSON.stringify(m),targetKey=m.n+'|'+m.target+'|'+m.route;kwShade55.hidden=m.n!==0;kwTip55.hidden=false;
 if(key!==kwTourKey55){kwTourKey55=key;kwTip55.replaceChildren();const meta=kwText55('div','',kwTip55);meta.className='kw55Meta';kwText55('span',m.n===0?'KURVFLICT':m.n+' / '+m.total,meta);kwButton55(meta,m.skip,()=>kwCall55('__tour55','exit'),'kw55Exit');if(m.n){const p=kwText55('div','',kwTip55);p.className='kw55Progress';kwText55('i','',p).style.width=(m.n/m.total*100)+'%'}kwText55('h3',m.title,kwTip55);kwText55('p',m.body,kwTip55);const actions=kwText55('div','',kwTip55);actions.className='kw55Actions';if(m.closeModal)kwButton55(actions,m.closeLabel,()=>kwCall55('__tour55','close'),'kw55Primary');else if(m.route)kwButton55(actions,m.routeLabel,()=>kwCall55('__tour55','route'),'kw55Primary');else if(m.next)kwButton55(actions,m.next,()=>kwCall55('__tour55','next'),'kw55Primary');if(m.skipStep)kwButton55(actions,m.skipStep,()=>kwCall55('__tour55','skip')); }
 if(kwLastTarget55!==targetKey){kwLastTarget55=targetKey;const el=m.target&&mount.querySelector(m.target);if(el){const r=el.getBoundingClientRect();const vp=el.closest('.worldViewport,main,.sheet'),v=vp?.getBoundingClientRect();if(r.left<0||r.right>innerWidth||r.top<0||r.bottom>innerHeight||v&&(r.left<v.left||r.right>v.right||r.top<v.top||r.bottom>v.bottom))el.scrollIntoView({block:'nearest',inline:'center',behavior:'instant'})}}
 kwTourPosition55();
}
async function kwPublishPlacement55(){if(!kwEditorData55||!window.KW_GM_REMOTE55)return;if(!confirm('Diese Positionen jetzt für alle Spieler auf main veröffentlichen?'))return;const layout=JSON.parse(JSON.stringify(kwEditorData55.layout));editing=true;mount.inert=true;kwEditor55.inert=true;try{const sha=await window.kwGMPublish55(layout);alert('Layout auf main gespeichert (Commit '+sha.slice(0,7)+'). GitHub Pages aktualisiert den bestehenden Spiellink nach dem Deployment.')}catch(e){alert(e.message)}finally{mount.inert=false;kwEditor55.inert=false;editing=false}}
function kwEditorDraw55(m){kwEditorData55=m;if(!m){kwEditor55.hidden=true;kwEditorKey55='';return}kwEditor55.hidden=false;const key=JSON.stringify(m)+'|'+kwEditorExpanded55;if(kwEditorKey55===key)return;kwEditorKey55=key;kwEditor55.replaceChildren();const header=kwText55('div','',kwEditor55);header.className='kw55EditorRow';kwText55('b','World Placement',header);kwButton55(header,kwEditorExpanded55?'−':'+',()=>{kwEditorExpanded55=!kwEditorExpanded55;kwEditorDraw55(kwEditorData55)});if(window.KW_GM_REMOTE55)kwButton55(header,'Live veröffentlichen',kwPublishPlacement55);kwEditor55.style.width=kwEditorExpanded55?'':'auto';if(!kwEditorExpanded55)return;kwText55('small','Ziehen: Position ändern. Karte außerhalb der Objekte scrollen.',kwEditor55);const select=kwText55('select','',kwEditor55);for(const item of m.items){const o=kwText55('option',item.name,select);o.value=item.id;o.selected=item.id===m.selected}select.onchange=()=>{const el=mount.querySelector('[data-map-id="'+select.value+'"]');el?.scrollIntoView({block:'nearest',inline:'center'});kwCall55('__layout55','select',select.value)};
 const v=m.layout[m.selected];for(const [k,label,min,max,step] of [['x','X %',1,99,.1],['y','Y %',1,99,.1],['scale','Größe',.4,2.5,.05],['z','Ebene',1,20,1]]){const l=kwText55('label','',kwEditor55);kwText55('span',label,l);const inp=kwText55('input','',l);Object.assign(inp,{type:'range',min,max,step,value:v[k]});const val=kwText55('span',String(v[k]),l);inp.oninput=()=>{val.textContent=inp.value;const el=mount.querySelector('[data-map-id="'+m.selected+'"]');if(!el)return;const n=Number(inp.value);if(k==='x')el.style.left=n+'%';if(k==='y')el.style.top=n+'%';if(k==='z')el.style.zIndex=n;if(k==='scale'){if(el.classList.contains('world45Npc')){const special=el.classList.contains('worldMopo50');el.style.width=(n*(special?7:8))+'%';el.style.height=(n*(special?18:29))+'%'}else el.style.transform='translate(-50%,-50%) scale('+n+')'}};inp.addEventListener('pointerdown',()=>{editing=true});inp.onchange=()=>{editing=false;kwCall55('__layout55','update',m.selected,{[k]:Number(inp.value)})}}
 const buttons=kwText55('div','',kwEditor55);buttons.className='kw55EditorRow';const area=kwText55('textarea','',kwEditor55);area.hidden=true;area.placeholder='Placement JSON';kwButton55(buttons,'Export',()=>{area.hidden=false;area.value=JSON.stringify(kwEditorData55.layout,null,2);area.focus();area.select()});kwButton55(buttons,'Import',()=>{if(area.hidden){area.hidden=false;area.focus();return}try{kwCall55('__layout55','import',null,JSON.parse(area.value))}catch(e){err('Ungültiges Placement JSON.')}});kwButton55(buttons,'Reset',()=>{if(confirm('Standard-Placement wiederherstellen?'))kwCall55('__layout55','reset')});}
window.addEventListener('pointerdown',e=>{if(!kwEditorData55||e.button!==0)return;const el=e.target.closest?.('.kw55Editing [data-map-id]');if(!el)return;const strip=el.closest('.world45Strip'),v=kwEditorData55.layout[el.dataset.mapId];if(!strip||!v)return;e.preventDefault();e.stopImmediatePropagation();editing=true;kwDrag55={el,strip,id:el.dataset.mapId,pointer:e.pointerId,x:e.clientX,y:e.clientY,oldX:v.x,oldY:v.y,nextX:v.x,nextY:v.y};try{el.setPointerCapture(e.pointerId)}catch{}},true);
window.addEventListener('pointermove',e=>{const d=kwDrag55;if(!d||e.pointerId!==d.pointer)return;e.preventDefault();e.stopImmediatePropagation();const r=d.strip.getBoundingClientRect();d.nextX=Math.max(1,Math.min(99,d.oldX+(e.clientX-d.x)*100/r.width));d.nextY=Math.max(1,Math.min(99,d.oldY+(e.clientY-d.y)*100/r.height));d.el.style.left=d.nextX+'%';d.el.style.top=d.nextY+'%'},true);
function kwDragEnd55(e){const d=kwDrag55;if(!d||e.pointerId!==d.pointer)return;e.preventDefault();e.stopImmediatePropagation();kwDrag55=null;editing=false;try{d.el.releasePointerCapture(d.pointer)}catch{}if(e.type==='pointercancel'){d.el.style.left=d.oldX+'%';d.el.style.top=d.oldY+'%';return}kwCall55('__layout55','update',d.id,{x:d.nextX,y:d.nextY})}
window.addEventListener('pointerup',kwDragEnd55,true);window.addEventListener('pointercancel',kwDragEnd55,true);window.addEventListener('click',e=>{if(kwEditorData55&&e.target.closest?.('.kw55Editing [data-map-id]')){e.preventDefault();e.stopImmediatePropagation()}},true);
window.addEventListener('resize',kwTourPosition55);document.addEventListener('scroll',kwTourPosition55,true);
const kwApply55=apply;apply=function(x){if(kwDrag55)return;kwApply55(x);kwEditorDraw55(x.editor55||null);kwTourDraw55(x.tour55||null)};

async function boot(){try{let x=await api('/api/me');if(!x.account){location.href='/';return}csrf=x.csrf;window.kwBoot?.stage('Spielstand und Oberfläche laden …',97);const view=await api('/api/game/view');apply(view);if(!mount.querySelector('#app'))throw Error('Spieloberfläche konnte nicht aufgebaut werden.');window.kwBoot?.ready();setInterval(()=>{if(!document.hidden&&!busy&&!editing&&!kwTextEditing()&&Date.now()-lastWorldScroll>220)send('/api/game/poll',{etag})},1000)}catch(e){err(e.message);window.kwBoot?.fail(e.message)}}document.addEventListener('visibilitychange',()=>{if(document.hidden){try{kwFrame.contentWindow.__save48?.()}catch{}}else if(!busy&&!editing&&!kwTextEditing())send('/api/game/poll',{etag})});window.addEventListener('pagehide',()=>{try{kwFrame.contentWindow.__save48?.()}catch{}});boot();window.kwGMStart55?.();
