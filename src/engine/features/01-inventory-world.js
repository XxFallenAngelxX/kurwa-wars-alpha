

function compactStacks(arr){let groups=new Map();for(let i of arr){if(!i||i.locked||!isMaterial(i))continue;let g=groups.get(i.material)||[];g.push(i);groups.set(i.material,g)}for(let g of groups.values()){for(let a=0;a<g.length;a++){for(let b=a+1;b<g.length&&g[a].qty<STACK_CAP;b++){let n=Math.min(STACK_CAP-g[a].qty,g[b].qty);g[a].qty+=n;g[b].qty-=n}}}for(let j=arr.length-1;j>=0;j--)if(isMaterial(arr[j])&&!arr[j].locked&&arr[j].qty===0)arr.splice(j,1)}
function sweepStorage(){if(battle?.running)return 0;let q=hqState(),moved=0;compactStacks(q.warehouse);compactStacks(s.bag);for(let i of [...s.bag]){if(!inventoryMoveMatches(i))continue;let n=Math.min(isMaterial(i)?i.qty:1,inventoryStoreRoom(i,q.warehouse,warehouseCap()));if(n>0&&inventoryTransfer(i.id,n))moved+=n}bagLayout();return moved}
function sweepStorageUI(){let n=sweepStorage();save();render();note(hubLabel('Eingelagert: ','Stored: ','На склад: ')+n+' · '+hqState().warehouse.length+'/'+warehouseCap());render();inventoryOptions()}
const kw44Sort=sortBag;sortBag=function(){if(battle?.running)return false;compactStacks(s.bag);if(inventoryAutoMove().enabled)sweepStorage();return kw44Sort()};
const kw44MovePanel=inventoryMovePanel;inventoryMovePanel=function(){return kw44MovePanel()+`<button class="primary" onclick="sweepStorageUI()" ${inventoryAutoMove().enabled?'':'disabled'}>${hubLabel('Jetzt passende Beute einlagern','Store matching loot now','Перенести выбранную добычу')}</button><small>${hubLabel('Nur aktive Filter. Gesperrte Items bleiben im Rucksack.','Active filters only. Locked items stay in the bag.','Только активные фильтры. Заблокированные предметы остаются в рюкзаке.')}</small>`};
function sortWarehouse(){if(battle?.running)return;let a=hqState().warehouse;compactStacks(a);let cmp=(x,y)=>Number(isMaterial(x))-Number(isMaterial(y))||(isMaterial(x)?x.material.localeCompare(y.material)||(y.qty-x.qty):(y.r-x.r)||(y.l-x.l));let unlocked=a.filter(i=>!i.locked).sort(cmp);let j=0;for(let k=0;k<a.length;k++)if(!a[k].locked)a[k]=unlocked[j++];save();render()}
const kw44Warehouse=warehouseView;warehouseView=function(){return kw44Warehouse().replace('<div class="hqInventory grow">',`<div class="row"><button onclick="${warehouseSide==='bag'?'sortBag()':'sortWarehouse()'}">${hubLabel('Sortieren / Stapeln','Sort / stack','Сортировать / объединить')}</button><button onclick="warehouseSweep()" ${inventoryAutoMove().enabled?'':'disabled'}>${hubLabel('Filter einlagern','Store matches','Перенести по фильтрам')}</button></div><div class="hqInventory grow">`)};
function warehouseSweep(){if(battle?.running)return;sweepStorage();save();render()}
warehouseMove=function(id){if(battle?.running)return false;let q=hqState(),store=warehouseSide==='store',from=store?q.warehouse:s.bag,to=store?s.bag:q.warehouse,i=from.find(x=>x.id===id);if(!i||i.locked)return false;let n=Math.min(isMaterial(i)?i.qty:1,inventoryStoreRoom(i,to,store?BAG_CAP:warehouseCap()));if(n>0&&inventoryTransfer(id,n,store)){save();render();return true}note(hubLabel('Kein Platz im Ziel.','No space at destination.','Нет места.'));render();return false};
function worldDungeon(m){if(battle?.running)return;if(!kwFeatureAllowed(m)){kwGate54(kwFeatureLevel(m));return;}dungeonMode=m;dungeonList=true;go('Dungeons')}
function worldFuture(which){$('modal').hidden=false;$('modal').innerHTML=`<div class="sheet"><h3>${which==='gang'?hubLabel('Gildenhalle','Gang hall','Зал банды'):hubLabel('Kristallmine','Crystal mine','Кристальная шахта')}</h3><p>${hubLabel('Dieser Bereich ist für ein späteres Update reserviert.','Reserved for a future update.','Зона для будущего обновления.')}</p><button onclick="closeItem()">${hubLabel('Schließen','Close','Закрыть')}</button></div>`}

const WORLD45_ART='@@LOCAL:world45.webp@@';
const WORLD45_NPC=['@@LOCAL:npc45_mopo.webp@@','@@LOCAL:npc45_miau.webp@@','@@LOCAL:npc45_babu.webp@@','@@LOCAL:npc45_pf.webp@@'];
function world45Spot(x,y,label,action,future=false){return `<button class="world45Pin ${future?'future':''}" style="left:${x}%;top:${y}%" onclick="${action}">${logEscape(label)}</button>`}
function world45Npc(x,y,i,n,label,action){return `<button class="world45Npc ${i===0?'worldMopo50':''}" style="left:${x}%;top:${y}%" onclick="${action}" aria-label="${logEscape(n+' · '+label)}"><img src="${WORLD45_NPC[i]}" alt=""><span><b>${logEscape(n)}</b><small>${logEscape(label)}</small></span></button>`}
garageView=function(){let L=hubLabel,p=world45Spot,n=world45Npc;return `<div class="worldViewport grow" aria-label="${L('Spielwelt horizontal verschieben','Scroll world horizontally','Прокрутка мира')}"><div class="world45Strip" style="background-image:url('${WORLD45_ART}')">${[
n(6,73,1,'Don Miau',L('Händler','Shop','Торговец'),"go('Händler')"),
n(15,83,3,'Pfandimir',L('Pfandspiel','Memory','Пары'),"go('Pfandspiel')"),
p(28,43,L('Fuhrpark','Motor pool','Автопарк'),"fleetOpen()"),
n(39,98,0,'Mopowitsch',L('Aufträge','Quests','Задания'),"go('Missionen')"),
p(33,75,L('Garage-Ausbau','Upgrades','Улучшения'),"go('Ausbau')"),
n(44,72,2,'Babuschka',L('Tresen','Bar','Бар'),"go('Kiosk')"),
p(42,28,L('Toilette','Toilet','Туалет')+(s.level<10?' · '+kwLock54(10):''),"go('Opferraum')",s.level<10),
p(52,31,'OROKAI · HQ',"go('Hauptquartier')"),
p(66,52,L('Lager','Warehouse','Склад'),"go('Lagerhalle')"),
p(59,49,L('Story-Verliese','Story dungeons','Подземелья'),"worldDungeon('story')"),
p(55,70,L('Arena','Arena','Арена'),"go('Arena')"),
p(85,80,L('Ewige Spalte des Abgrunds','Eternal Abyssal Rift','Вечный разлом бездны'),"worldDungeon('tower')"),
p(63.5,86,L('Abwasser-Marathon','Sewer marathon','Канализационный марафон'),"worldDungeon('event')"),
p(70,67,L('Nachtdienst','Night shift','Ночная смена'),"go('Nachtdienst')"),
p(75,41,L('Diskothek','Disco','Дискотека'),"worldDungeon('fairy')"),
p(85,44,L('Gildenhalle','Gang hall','Зал банды'),"worldFuture('gang')",true),
p(37,38,L('Edelsteinwerkbank','Gem workbench','Верстак самоцветов')+(s.level<20?' · '+kwLock54(20):''),"go('Edelsteinwerkbank')",s.level<20),
p(95,54,L('Kristallmine','Crystal mine','Шахта'),"worldFuture('mine')",true)
].join('')}</div></div><div class="worldHint">‹ ${L('Wischen zum Erkunden','Swipe to explore','Листай для обзора')} ›</div>`};
