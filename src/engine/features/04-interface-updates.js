// WC label is rendered independently of the route ID.
// Search is a view filter, never a loot-routing rule or destructive action.
let search47='',cat47=0,rar47=-1,type47=-1,tier47=0,material47=-1,family47=-1;
function warehouseSearch47(v){search47=String(v).slice(0,100);warehousePage=0;render()}
function warehouseFilter47(k,v){v=Number(v);if(!Number.isInteger(v))return; if(k==='cat'){cat47=clamp(v,0,3);rar47=type47=-1;tier47=0;material47=family47=-1;}if(k==='material')material47=clamp(v,-1,MATERIALS.length-1);if(k==='family')family47=clamp(v,-1,GEM_FAMILIES.length-1);if(k==='rar')rar47=clamp(v,-1,8);if(k==='type')type47=clamp(v,-1,5);if(k==='tier')tier47=clamp(v,0,100);warehousePage=0;render()}
function warehouseReset47(){search47='';cat47=0;rar47=type47=material47=family47=-1;tier47=0;warehousePage=0;render()}
function warehouseMatches47(i){let m=isMaterial(i),g=m&&gemData(i.material),n=(inventoryName(i)+' '+(m?i.material:catalog[i.a]?.[0]+' '+rarity47Text(rarity47(i))+' '+slots[i.slot])).normalize('NFKC').toLocaleLowerCase();if(search47.trim()&&!search47.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).every(x=>n.includes(x)))return false;if(cat47===1&&m||cat47===2&&(!m||g)||cat47===3&&!g)return false;if(cat47===0||cat47===1){if(rar47>=0&&(m||rarity47(i)!==rar47))return false;if(type47>=0&&(m||i.slot!==type47))return false}if(cat47===2&&material47>=0&&i.material!==MATERIALS[material47].id)return false;if(cat47===3&&(tier47>0&&g?.tier!==tier47||family47>=0&&g?.family.id!==GEM_FAMILIES[family47].id))return false;return true}
function warehouseSelect47(k,v,rows){return `<select aria-label="${logEscape(rows[0][1])}" onchange="warehouseFilter47('${k}',this.value)">${rows.map(([id,n])=>`<option value="${id}" ${id===v?'selected':''}>${logEscape(n)}</option>`).join('')}</select>`}
warehouseView=function(){let q=hqState(),raw=warehouseSide==='bag'?s.bag:q.warehouse,arr=raw.filter(warehouseMatches47),pages=Math.max(1,Math.ceil(arr.length/12));warehousePage=clamp(warehousePage,0,pages-1);let L=hubLabel,all=L('Alle','All','Все');return `<button onclick="go('Hauptquartier')">‹ OROKAI COMPLEX</button><div class="row mode"><button class="${warehouseSide==='bag'?'active':''}" onclick="warehouseSwitch('bag')">${L('Rucksack','Backpack','Рюкзак')} ${s.bag.length}/${BAG_CAP}</button><button class="${warehouseSide==='store'?'active':''}" onclick="warehouseSwitch('store')">${L('Lager','Warehouse','Склад')} ${q.warehouse.length}/${warehouseCap()}</button></div><div class="kw47Filters"><div class="row"><input id="warehouseSearch47" type="search" maxlength="100" value="${logEscape(search47)}" placeholder="${L('Name suchen …','Search name …','Поиск имени …')}" onchange="warehouseSearch47(this.value)"><button onclick="warehouseReset47()">${L('Reset','Reset','Сброс')}</button></div><div class="row">${warehouseSelect47('cat',cat47,[[0,L('Alle Kategorien','All categories','Все категории')],[1,L('Ausrüstung','Gear','Экипировка')],[2,L('Material','Materials','Материалы')],[3,L('Edelsteine','Gems','Самоцветы')]])}${cat47<2?warehouseSelect47('rar',rar47,[[-1,L('Alle Seltenheiten','All rarities','Все редкости')],...Array.from({length:9},(_,k)=>[k,rarity47Text(k)])]):cat47===3?warehouseSelect47('tier',tier47,[[0,L('Alle Stufen','All tiers','Все уровни')],...Array.from({length:100},(_,k)=>[k+1,'T'+(k+1)])]):''}</div>${cat47<2?warehouseSelect47('type',type47,[[-1,L('Alle Slots','All slots','Все слоты')],...slots.map((n,k)=>[k,n])]):cat47===2?warehouseSelect47('material',material47,[[-1,L('Alle Materialien','All materials','Все материалы')],...MATERIALS.map((m,k)=>[k,materialName(m.id)])]):warehouseSelect47('family',family47,[[-1,L('Alle Edelsteinarten','All gem types','Все типы самоцветов')],...GEM_FAMILIES.map((g,k)=>[k,hubLabel(...g.n)])])}<small>${arr.length}/${raw.length} ${L('Treffer','matches','совпадений')} · ${L('Suche ändert keine Auto-Filter.','Search does not change auto-filters.','Поиск не меняет автофильтры.')}</small></div><div class="row"><button onclick="${warehouseSide==='bag'?'sortBag()':'sortWarehouse()'}">${L('Sortieren / Stapeln','Sort / stack','Сортировать / объединить')}</button><button onclick="warehouseSweep()" ${inventoryAutoMove().enabled?'':'disabled'}>${L('Filter einlagern','Store matches','Перенести по фильтрам')}</button></div><div class="hqInventory grow">${Array.from({length:12},(_,j)=>{let i=arr[warehousePage*12+j];return i?`<div>${slot(i,`warehouseMove('${i.id}')`)}<small>${logEscape(inventoryName(i))}</small></div>`:'<div class="slot empty">·</div>'}).join('')}</div><div class="row"><button onclick="warehousePage--;render()" ${warehousePage===0?'disabled':''}>‹</button><small>${warehousePage+1}/${pages}</small><button onclick="warehousePage++;render()" ${warehousePage+1>=pages?'disabled':''}>›</button></div>`};
function gmSpecial47(kind,k=0){if(!gmAllowed()||!gmState().enabled||battle?.running)return false;let need=kind==='set'?6:3;if(s.bag.length+need>BAG_CAP){note(hubLabel('Nicht genug freie Rucksackplätze.','Not enough free backpack slots.','Недостаточно места в рюкзаке.'));render();return false}for(let j=0;j<need;j++){let slotId=kind==='set'?j:j*2,a=kind==='set'&&SET47_BASES[k]?.[slotId]>=0?SET47_BASES[k][slotId]:pick(REGULAR_POOL.filter(a=>catalog[a][1]===slotId)),i=make(a,s.level,kind==='set'?4:5);special47(i,kind,kind==='set'?k:j);s.bag.push(i);rememberItem(i)}save();render();return true}
const old47GMView=gmView;gmView=function(){return old47GMView().replace('<div class="gmActions">','<div class="gmActions">'+SET47.map((x,k)=>`<button onclick="gmSpecial47('set',${k})" ${gmState().enabled?'':'disabled'}>Set · ${hubLabel(...x.n)}</button>`).join('')+`<button onclick="gmSpecial47('myth')" ${gmState().enabled?'':'disabled'}>${hubLabel('Mythische Testitems','Mythic test gear','Мифические тестовые предметы')}</button>`)};

window.__events=[];
for(const k of ['scene','fx','voice']){const old=AudioGame[k];AudioGame[k]=function(v){if(k!=='voice'||v==='level')window.__events.push([k,v]);if(window.__events.length>60)window.__events.shift();if(k==='voice'&&v!=='level')old(v);};}
AudioGame.unlock=()=>{};AudioGame.status=()=>parent.localAudioStatus();
window.confirm=()=>!!window.__confirmed;
window.__controls=new Map();window.__tokens=new Map();window.__gmLevelDraft=null;window.__profileDraft='';
window.__canReloadForUpdate=()=>page!=='Kampf'&&!battle?.running&&$('modal').hidden;
function updateAdventureBar(){
 const bar=$('adventureBar');if(!bar)return;
 const blocked=onboard52||page==='Profile'||page==='Kampf'||!!battle?.running;
 const trip=s.travel,left=trip?Math.max(0,trip.end-Date.now()):0;
 const progress=trip?clamp(100*(Date.now()-trip.start)/Math.max(1,trip.end-trip.start),0,100):0;
 const title=trip?(trip.o?.name||missionLabel('Abenteuer','Adventure','Приключение')):missionLabel('Abenteuer','Adventure','Приключение');
 let state=page==='Kampf'?(battle?.running?missionLabel('Kampf läuft','In combat','Идёт бой'):missionLabel('Kampf beendet','Combat finished','Бой окончен')):trip?(left?missionTime(left):missionLabel('Bereit','Ready','Готово')):missionLabel('Aufträge öffnen','Open quests','Открыть задания');
 if(trip&&!left&&bagFull()&&page!=='Kampf')state=missionLabel('Rucksack voll','Backpack full','Рюкзак полон');
 bar.disabled=blocked;bar.classList.toggle('ready',!!trip&&!left&&page!=='Kampf');bar.classList.toggle('idle',!trip);
 bar.querySelector('.adventureBarTitle').textContent=title;
 bar.querySelector('.adventureBarState').textContent=state;
 bar.querySelector('.adventureBarFill').style.width=progress+'%';
 bar.setAttribute('aria-label',title+' · '+state);
}
window.__snapshot=function(drain=true){
 chat46Sync();updateAdventureBar();const app=$('app'),modal=$('modal'),isModal=!modal.hidden;if(page==='Admin'&&window.__gmLevelDraft!==null&&$('gmLevel'))$('gmLevel').value=window.__gmLevelDraft;
 if($('profileInput'))$('profileInput').value=window.__profileDraft;const roots=[...app.querySelectorAll('button,input,select,[onclick]')];
 const clone=app.cloneNode(true),copies=[...clone.querySelectorAll('button,input,select,[onclick]')];
 const audioStatus=clone.querySelector('#audioStatus');if(audioStatus)audioStatus.textContent=parent.localAudioStatus();
 const old=window.__tokens, next=new Map(),controls=new Map(),counts=new Map();
  let context=page+'|'+(isModal?'modal':'main')+'|'+(sel||'');
  if(page==='Händler')context+='|'+s.shop.map(q=>q.i?.id+':'+q.sold).join(',');
  if(page==='Missionen')context+='|'+mp+'|'+(s.travel?.start||'')+'|'+offers.map(q=>q.qid).join(',');
  if(page==='Expedition')context+='|'+(s.expedition?.run?.step??-1)+'|'+s.expedition?.run?.status;
  if(page==='Dungeons')context+='|'+dp+'|'+dungeonMode+'|'+s.d.join(',')+'|'+s.tower+'|'+fairyProgress();
  if(page==='Pfandspiel')context+='|'+(s.pf?.round?.id||'')+'|'+(s.pf?.round?.moves||0);

 for(let i=0;i<roots.length;i++){
  const e=roots[i],c=copies[i];if(!c)continue;
  if(e.tagName==='INPUT'||e.tagName==='SELECT'){c.setAttribute('value',e.value);if(e.tagName==='SELECT')for(let j=0;j<c.options.length;j++)c.options[j].toggleAttribute('selected',e.options[j].selected);}
  const action=e.getAttribute('onclick')||e.getAttribute('onchange')||e.getAttribute('oninput')||(e.id==='journeyNotice'?'journeyShortcut()':e.id==='gmLevel'?'gmLevelInput':e.id==='profileInput'?'profileTextInput':'');
  if(!action||e.disabled||e.closest('[hidden]')||(isModal&&!modal.contains(e)))continue;
  const base=context+'|'+action+'|'+(e.id||'');const n=counts.get(base)||0;counts.set(base,n+1);const key=base+'|'+n;
  const token=old.get(key)||Array.from(crypto.getRandomValues(new Uint32Array(4)),x=>x.toString(16).padStart(8,'0')).join('');
  next.set(key,token);controls.set(token,{element:e,action});c.dataset.control=token;
  if(/^(resetGame|cancelShift|pfAbort|sacrifice|discardMaterial|socketGem|enchantApply47)\(/.test(action))c.dataset.confirm='1';
  if(action.startsWith('AudioGame.'))c.dataset.audio=action;
  if(action==='serverPortal()')c.dataset.portal='1';
 }
 // The replicated backdrop has its own capability, not a parent data-control.
 // Bind it to the current modal controls so stale clicks cannot dismiss a different dialog.
 if(isModal&&kwModalCanDismiss(modal)){
  const key=context+'|backdrop|'+[...controls.values()].map(c=>c.action).join('|');
  const token=old.get(key)||Array.from(crypto.getRandomValues(new Uint32Array(4)),x=>x.toString(16).padStart(8,'0')).join('');
  next.set(key,token);controls.set(token,{element:modal,action:'kwDismissBackdrop()'});clone.querySelector('#modal').dataset.backdropControl=token;
 }
 window.__tokens=next;window.__controls=controls;
 const clean=root=>{for(const el of [root,...root.querySelectorAll('*')])for(const a of [...el.attributes]){if(/^on/i.test(a.name))el.removeAttribute(a.name);else if(a.value.includes('http://kw-engine.invalid'))el.setAttribute(a.name,a.value.split('http://kw-engine.invalid').join(''));}root.querySelectorAll('script,iframe,object,embed').forEach(e=>e.remove());};
 world45Dialogues(clone);clean(clone);const walker=document.createTreeWalker(clone,NodeFilter.SHOW_TEXT);let nodes=[];while(walker.nextNode())if(walker.currentNode.nodeValue.includes('◆'))nodes.push(walker.currentNode);for(let node of nodes){let f=document.createDocumentFragment(),parts=node.nodeValue.split('◆');parts.forEach((v,j)=>{if(j){let img=document.createElement('img');img.className='crystal52Icon';img.src='@@LOCAL:kw52_crystal.webp@@';img.alt=hubLabel('Kristalle','Crystals','Кристаллы');f.append(img)}f.append(document.createTextNode(v))});node.replaceWith(f)}let sub=null;
 const events=drain?window.__events.splice(0):[];
 return {markup:clone.outerHTML+(sub?sub.outerHTML:''),lang:s.lang,scene:audioScene(),events};
};
window.__act=function(token,value,confirmed){
 window.__snapshot(false);const c=window.__controls.get(token);if(!c)return {ok:false,reason:'Ansicht geändert. Bitte erneut auswählen.'};
 const e=c.element;window.__confirmed=confirmed===true;
 try{
  if(c.action==='serverPortal()')return {ok:true,portal:true};
  if(c.action==='kwDismissBackdrop()'){if(e!==$('modal')||!kwModalCanDismiss(e))return {ok:false,reason:'Dialog kann nicht geschlossen werden.'};closeItem();window.__tokens.clear();return {ok:true,action:c.action};}
  if(e.tagName==='INPUT'||e.tagName==='SELECT'){
   if(c.action==='profileTextInput'){if(typeof value!=='string'||value.length>20)return {ok:false,reason:'Ungültiger Name.'};window.__profileDraft=value;e.value=value;return {ok:true};}if(e.id==='warehouseSearch47'){if(typeof value!=='string'||value.length>100)return {ok:false,reason:'Invalid search'};warehouseSearch47(value);window.__tokens.clear();return {ok:true};}if(e.tagName==='SELECT'){if(typeof value!=='string'||![...e.options].some(o=>o.value===value))return {ok:false,reason:'Invalid filter'};e.value=value;e.dispatchEvent(new Event('change',{bubbles:true}));window.__tokens.clear();return {ok:true};}if(!['number','range'].includes(e.type)||typeof value!=='string'||value.length>32||!/^[-+]?\d+(\.\d+)?$/.test(value)||!Number.isFinite(Number(value)))return {ok:false,reason:'Ungültiger Eingabewert.'};
   e.value=value;if(c.action==='gmLevelInput')window.__gmLevelDraft=e.value;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));
  }else {if(c.action==='profileCreateDialog()')window.__profileDraft='';e.click();if(c.action==="gmAction('level')")window.__gmLevelDraft=null;}
  window.__tokens.clear();return {ok:true,action:c.action};
 }finally{window.__confirmed=false;}
};
function migrateMyth52(){let changed=false;for(let i of [...s.eq,...s.bag,...(hqState().warehouse||[]),...(s.shop||[]).map(o=>o.i)])if(myth47(i)&&Array.isArray(i.mods)&&i.mods.length<8){let n=i.mods.length;extendMyth52(i);if(i.mods.length!==n)changed=true}if(changed)save();return changed}

