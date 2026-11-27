/* Active resource gathering, daily tasks and material exchange. Profile-scoped state. */
const KW_ACTIVITY_NAMES={Schrottplatz:['Schrottsuche','Scrap hunting','Поиск лома'],SchwarzesBrett:['Schwarzes Brett','Notice board','Доска заданий'],Kristallmine:['Kristallmine','Crystal mine','Кристальная шахта'],Schwarzmarkt:['Schwarzmarkt','Black market','Чёрный рынок']};
const KW_SCRAP_OPTIONS=[{name:['Schrotthaufen','Scrap pile','Куча лома'],cost:5,chance:.72,double:.08,common:true},{name:['Elektroschrott','Electronic waste','Электронный лом'],cost:8,chance:.58,double:.20,min:8},{name:['Container','Container','Контейнер'],cost:12,chance:.42,double:.45,min:7,bulk:true}];
const KW_ACTIVITY_ENCOUNTER_CHANCE=.30;
const KW_ACTIVITY_FOES={Schrottplatz:[0,14,15,37,39,58,59],Kristallmine:[5,14,15,21,30,33]};
function kwActivityEncounterRoll(){return Math.random()<KW_ACTIVITY_ENCOUNTER_CHANCE}
function kwActivityEnemy(){let e=kwActivityState().encounter;if(!e||e.status!=='ready'||!kwActivityAccess(e.area))return null;return {...e.enemy}}
function kwActivityBeginEncounter(area,index,find){let a=kwActivityState();if(!kwActivityEncounterRoll())return false;let type=pick(KW_ACTIVITY_FOES[area]),l=s.level,cost=[5,10,15][index];a.encounter={area,status:'ready',find,enemy:{activity:area,type,enemy:foeTypes[type][0],l,cost,g:Math.round(26+13*l),x:Math.round(18+10*l),difficulty:.90+.06*index,variance:1,bg:area==='Schrottplatz'?2:5}};save();if(!bagFull())start('activity');else render();return true}
function kwActivityApplyFind(find){let a=kwActivityState();if(find.crystals){s.premium+=find.crystals;return '+'+find.crystals+' ◆'}if(find.key){a.pending={key:find.key,qty:find.qty};let n=kwActivityDeliver();return materialName(find.key)+' ×'+n+(a.pending?' · '+hubLabel('Rest abholen','Collect remainder','Забрать остаток'):'')}return find.empty==='mine'?hubLabel('Nur Gestein.','Only rock.','Только камень.'):hubLabel('Nichts Brauchbares gefunden.','Nothing useful found.','Ничего полезного.')}
function kwActivityResolve(area,index,find){if(kwActivityBeginEncounter(area,index,find))return true;kwActivityFinish(kwActivityApplyFind(find));return true}
function kwActivityCompleteEncounter(b){let a=kwActivityState(),e=a.encounter;if(!e||e.status!=='fighting'||e.area!==b.o.activity)return false;delete a.encounter;if(b.win){b.activityReward=kwActivityApplyFind(e.find);a.last=b.activityReward;battleLog(b,hubLabel('Aktivitätsfund: ','Activity find: ','Находка: ')+b.activityReward,'outgoing')}else a.last=hubLabel('Fund verloren.','Find lost.','Находка потеряна.');return true}
function kwActivityEncounterPanel(id){let e=kwActivityState().encounter;if(!e)return '';let L=hubLabel;if(e.area!==id)return '<div class="panel stack"><small>'+L('Eine Begegnung wartet.','An encounter is waiting.','Вас ждёт встреча.')+'</small><button onclick="go(\''+e.area+'\')">'+L('Zur Begegnung','Go to encounter','К встрече')+'</button></div>';return '<div class="panel stack"><b>'+L('Überraschungsgegner!','Surprise enemy!','Неожиданный противник!')+'</b><div class="row"><img style="width:54px;height:54px;object-fit:contain" src="'+enemyArt(e.enemy.type)+'" alt=""><span>'+logEscape(e.enemy.enemy)+' · Lv '+e.enemy.l+'</span></div><button class="primary" onclick="start(\'activity\')" '+(bagFull()?'disabled':'')+'>'+(bagFull()?L('Rucksack voll','Backpack full','Рюкзак полон'):L('Kämpfen · keine weitere Ausdauer','Fight · no extra energy','Бой · без доп. энергии'))+'</button></div>'}
function kwActivityRecoverEncounter(){let a=s.activities62;if(a?.encounter?.status==='fighting'){delete a.encounter;a.last=hubLabel('Begegnung abgebrochen – Fund verloren.','Encounter abandoned – find lost.','Бой прерван — находка потеряна.');save()}}
function kwActivityDay(now=Date.now()){return Math.floor(now/86400000)}
function kwActivityState(){return s.activities62??={searches:0,excavations:0,tool:0,pending:null,board:null,market:null,last:''}}
function kwActivityCounters(){let a=kwActivityState(),sum=arr=>(arr||[]).reduce((n,v)=>n+(Number(v)||0),0);return {wins:s.wins||0,arena:s.arena?.wins||0,searches:a.searches||0,excavations:a.excavations||0,training:sum(s.training),rooms:sum(s.rooms),shifts:s.shifts||0,memory:s.pf?.wins||0,purchases:a.purchases||0,missions:a.missions||0,sacrifices:a.sacrifices||0,energySpent:a.energySpent||0,arenaPlayed:(s.arena?.wins||0)+(s.arena?.losses||0),expeditions:s.expedition?.completed||0,tower:s.tower||0}}
function kwBoardRecord(id,n=1){kwActivityTick();let a=kwActivityState();a[id]=(a[id]||0)+n}
function kwActivityTick(){if(!kwFeatureAllowed('SchwarzesBrett'))return;let a=kwActivityState(),day=kwActivityDay();if(!a.board||day>a.board.day)a.board={day,level:s.level,base:kwActivityCounters(),claimed:{},taskIds:kwBoardSelect(day,s.level).map(t=>t.id)};else {a.board.base??={};a.board.claimed??={};a.board.taskIds??=kwBoardLegacyTasks(a.board.level).map(t=>t.id);for(let [id,n] of Object.entries(kwActivityCounters()))if(a.board.base[id]===undefined)a.board.base[id]=n;}if(kwFeatureAllowed('Schwarzmarkt')&&(!a.market||day>a.market.day))a.market={day,bought:{}}}
function kwActivityAccess(id){return !onboard52&&!battle?.running&&page===id&&kwFeatureAllowed(id)}
function kwActivityFinish(msg){kwActivityState().last=msg;save();render()}
function kwActivityDeliver(){let a=kwActivityState(),p=a.pending;if(!p)return 0;let n=addMaterial(p.key,p.qty);p.qty-=n;if(!p.qty)a.pending=null;return n}
function kwActivityClaim(){if(!KW_ACTIVITY_NAMES[page]||!kwActivityAccess(page))return false;let n=kwActivityDeliver();kwActivityFinish(n?hubLabel('Fund eingesammelt.','Find collected.','Находка собрана.'):hubLabel('Kein Lagerplatz.','No inventory space.','Нет места.'));return !!n}
function kwActivityFind(key,qty){let a=kwActivityState();a.pending={key,qty};let n=kwActivityDeliver();kwActivityFinish(materialName(key)+' ×'+n+(a.pending?' · '+hubLabel('Rest abholen','Collect remainder','Забрать остаток'):''))}
function kwScrapSearch(index){if(!kwActivityAccess('Schrottplatz')||!Number.isInteger(index)||!KW_SCRAP_OPTIONS[index])return false;let a=kwActivityState(),o=KW_SCRAP_OPTIONS[index];if(a.pending||a.encounter||s.level<(o.min||7)||!spendEnergy(o.cost))return false;kwActivityTick();a.searches++;let pool=materialPool(s.level).filter(m=>o.common?MATERIAL_GATES[m.id]===1:index===1?MATERIAL_GATES[m.id]>=8:true);if(!pool.length)pool=materialPool(s.level);if(o.bulk){let advanced=pool.filter(m=>MATERIAL_GATES[m.id]>=8);if(advanced.length&&Math.random()<.55)pool=advanced}if(Math.random()>=o.chance||!pool.length)return kwActivityResolve('Schrottplatz',index,{empty:'scrap'});return kwActivityResolve('Schrottplatz',index,{key:pick(pool).id,qty:o.bulk?3+Math.floor(Math.random()*4):Math.random()<o.double?2:1})}
const KW_MINE_DEPTHS=[{name:['Oberer Stollen','Upper tunnel','Верхний штрек'],tool:0,cost:10,bonus:0,material:'scrap'},{name:['Violette Ader','Violet vein','Фиолетовая жила'],tool:3,cost:14,bonus:.07,material:'bolts'},{name:['Tiefenkammer','Deep chamber','Глубокая камера'],tool:7,cost:18,bonus:.12,material:'precision'}];
function kwMineChance(tool){return .18+.014*Math.min(10,Math.max(0,tool))}
function kwMineDig(depth=0){if(!kwActivityAccess('Kristallmine')||!Number.isInteger(depth)||!KW_MINE_DEPTHS[depth])return false;let a=kwActivityState(),d=KW_MINE_DEPTHS[depth];if(a.tool<d.tool||a.pending||a.encounter||!spendEnergy(d.cost))return false;kwActivityTick();a.excavations++;let roll=Math.random();if(roll<kwMineChance(a.tool)+d.bonus){let n=Math.random()<(.10+.05*depth)?2:1;return kwActivityResolve('Kristallmine',depth,{crystals:n})}if(roll<.60+.04*depth&&MATERIAL_GATES[d.material]<=s.level)return kwActivityResolve('Kristallmine',depth,{key:d.material,qty:depth===2&&Math.random()<.25?2:1});return kwActivityResolve('Kristallmine',depth,{empty:'mine'})}
function kwMinePrice(tool){return {gold:Math.round(1500*(tool+1)**1.55),req:{scrap:3+tool*2,precision:1+Math.floor(tool/2)}}}
function kwMineUpgrade(){if(!kwActivityAccess('Kristallmine'))return false;let a=kwActivityState();if(a.tool>=10)return false;let p=kwMinePrice(a.tool);if(s.gold<p.gold||!consumeMaterials(p.req))return false;s.gold-=p.gold;a.tool++;kwActivityFinish(hubLabel('Werkzeug verbessert.','Tool upgraded.','Инструмент улучшен.'));return true}
// Stable daily selection: one task per eligible activity, no reroll on reload.
const KW_BOARD_POOL=[
 {
  "id": "wins_3",
  "counter": "wins",
  "min": 5,
  "target": 3,
  "name": [
   "3 Kämpfe gewinnen (außer Arena/Expedition)",
   "3 fights won (not arena/expedition)",
   "3 побед вне арены и экспедиции"
  ]
 },
 {
  "id": "wins",
  "counter": "wins",
  "min": 5,
  "target": 5,
  "name": [
   "5 Kämpfe gewinnen (außer Arena/Expedition)",
   "5 fights won (not arena/expedition)",
   "5 побед вне арены и экспедиции"
  ]
 },
 {
  "id": "wins_8",
  "counter": "wins",
  "min": 5,
  "target": 8,
  "name": [
   "8 Kämpfe gewinnen (außer Arena/Expedition)",
   "8 fights won (not arena/expedition)",
   "8 побед вне арены и экспедиции"
  ]
 },
 {
  "id": "wins_more",
  "counter": "wins",
  "min": 5,
  "target": 10,
  "name": [
   "10 Kämpfe gewinnen (außer Arena/Expedition)",
   "10 fights won (not arena/expedition)",
   "10 побед вне арены и экспедиции"
  ]
 },
 {
  "id": "missions_1",
  "counter": "missions",
  "min": 5,
  "target": 1,
  "name": [
   "1 Abenteuer gewinnen",
   "1 adventure won",
   "1 победа в приключении"
  ]
 },
 {
  "id": "missions_2",
  "counter": "missions",
  "min": 5,
  "target": 2,
  "name": [
   "2 Abenteuer gewinnen",
   "2 adventures won",
   "2 побед в приключениях"
  ]
 },
 {
  "id": "missions",
  "counter": "missions",
  "min": 5,
  "target": 3,
  "name": [
   "3 Abenteuer gewinnen",
   "3 adventures won",
   "3 побед в приключениях"
  ]
 },
 {
  "id": "missions_5",
  "counter": "missions",
  "min": 5,
  "target": 5,
  "name": [
   "5 Abenteuer gewinnen",
   "5 adventures won",
   "5 побед в приключениях"
  ]
 },
 {
  "id": "arena_1",
  "counter": "arena",
  "min": 5,
  "target": 1,
  "name": [
   "1 Arena-Sieg",
   "1 arena win",
   "1 победа на арене"
  ]
 },
 {
  "id": "arena",
  "counter": "arena",
  "min": 5,
  "target": 2,
  "name": [
   "2 Arena-Siege",
   "2 arena wins",
   "2 побед на арене"
  ]
 },
 {
  "id": "arena_3",
  "counter": "arena",
  "min": 5,
  "target": 3,
  "name": [
   "3 Arena-Siege",
   "3 arena wins",
   "3 побед на арене"
  ]
 },
 {
  "id": "arena_more",
  "counter": "arena",
  "min": 5,
  "target": 4,
  "name": [
   "4 Arena-Siege",
   "4 arena wins",
   "4 побед на арене"
  ]
 },
 {
  "id": "training_1",
  "counter": "training",
  "min": 5,
  "target": 1,
  "name": [
   "1 Attributpunkt trainieren",
   "1 attribute point trained",
   "1 повышение характеристики"
  ]
 },
 {
  "id": "training_2",
  "counter": "training",
  "min": 5,
  "target": 2,
  "name": [
   "2 Attributpunkte trainieren",
   "2 attribute points trained",
   "2 повышений характеристик"
  ]
 },
 {
  "id": "training",
  "counter": "training",
  "min": 5,
  "target": 3,
  "name": [
   "3 Attributpunkte trainieren",
   "3 attribute points trained",
   "3 повышений характеристик"
  ]
 },
 {
  "id": "training_5",
  "counter": "training",
  "min": 5,
  "target": 5,
  "name": [
   "5 Attributpunkte trainieren",
   "5 attribute points trained",
   "5 повышений характеристик"
  ]
 },
 {
  "id": "shifts",
  "counter": "shifts",
  "min": 5,
  "target": 1,
  "name": [
   "1 Nachtdienst abschließen",
   "1 night shift completed",
   "1 завершённая ночная смена"
  ]
 },
 {
  "id": "shifts_2",
  "counter": "shifts",
  "min": 5,
  "target": 2,
  "name": [
   "2 Nachtdienste abschließen",
   "2 night shifts completed",
   "2 завершённых ночных смен"
  ]
 },
 {
  "id": "shifts_3",
  "counter": "shifts",
  "min": 5,
  "target": 3,
  "name": [
   "3 Nachtdienste abschließen",
   "3 night shifts completed",
   "3 завершённых ночных смен"
  ]
 },
 {
  "id": "memory",
  "counter": "memory",
  "min": 5,
  "target": 1,
  "name": [
   "1 Pfandspiel gewinnen",
   "1 memory game won",
   "1 победа в игре на память"
  ]
 },
 {
  "id": "memory_2",
  "counter": "memory",
  "min": 5,
  "target": 2,
  "name": [
   "2 Pfandspiele gewinnen",
   "2 memory games won",
   "2 побед в игре на память"
  ]
 },
 {
  "id": "memory_3",
  "counter": "memory",
  "min": 5,
  "target": 3,
  "name": [
   "3 Pfandspiele gewinnen",
   "3 memory games won",
   "3 побед в игре на память"
  ]
 },
 {
  "id": "rooms",
  "counter": "rooms",
  "min": 5,
  "target": 1,
  "name": [
   "1 Garagenausbau abschließen",
   "1 garage upgrade completed",
   "1 завершённое улучшение гаража"
  ]
 },
 {
  "id": "rooms_2",
  "counter": "rooms",
  "min": 5,
  "target": 2,
  "name": [
   "2 Garagenausbauten abschließen",
   "2 garage upgrades completed",
   "2 завершённых улучшений гаража"
  ]
 },
 {
  "id": "rooms_3",
  "counter": "rooms",
  "min": 5,
  "target": 3,
  "name": [
   "3 Garagenausbauten abschließen",
   "3 garage upgrades completed",
   "3 завершённых улучшений гаража"
  ]
 },
 {
  "id": "purchases",
  "counter": "purchases",
  "min": 5,
  "target": 1,
  "name": [
   "1 Gegenstand beim Händler kaufen",
   "1 shop item bought",
   "1 покупка у торговца"
  ]
 },
 {
  "id": "purchases_2",
  "counter": "purchases",
  "min": 5,
  "target": 2,
  "name": [
   "2 Gegenstände beim Händler kaufen",
   "2 shop items bought",
   "2 покупок у торговца"
  ]
 },
 {
  "id": "purchases_3",
  "counter": "purchases",
  "min": 5,
  "target": 3,
  "name": [
   "3 Gegenstände beim Händler kaufen",
   "3 shop items bought",
   "3 покупок у торговца"
  ]
 },
 {
  "id": "purchases_4",
  "counter": "purchases",
  "min": 5,
  "target": 4,
  "name": [
   "4 Gegenstände beim Händler kaufen",
   "4 shop items bought",
   "4 покупок у торговца"
  ]
 },
 {
  "id": "energy_20",
  "counter": "energySpent",
  "min": 5,
  "target": 20,
  "name": [
   "20 Ausdauer verbrauchen",
   "20 energy spent",
   "20 единиц потраченной энергии"
  ]
 },
 {
  "id": "energy_40",
  "counter": "energySpent",
  "min": 5,
  "target": 40,
  "name": [
   "40 Ausdauer verbrauchen",
   "40 energy spent",
   "40 единиц потраченной энергии"
  ]
 },
 {
  "id": "energy_60",
  "counter": "energySpent",
  "min": 5,
  "target": 60,
  "name": [
   "60 Ausdauer verbrauchen",
   "60 energy spent",
   "60 единиц потраченной энергии"
  ]
 },
 {
  "id": "energy_100",
  "counter": "energySpent",
  "min": 5,
  "target": 100,
  "name": [
   "100 Ausdauer verbrauchen",
   "100 energy spent",
   "100 единиц потраченной энергии"
  ]
 },
 {
  "id": "arena_played_2",
  "counter": "arenaPlayed",
  "min": 5,
  "target": 2,
  "name": [
   "2 Arenakämpfe beenden",
   "2 arena fights completed",
   "2 завершённых боёв на арене"
  ]
 },
 {
  "id": "arena_played_4",
  "counter": "arenaPlayed",
  "min": 5,
  "target": 4,
  "name": [
   "4 Arenakämpfe beenden",
   "4 arena fights completed",
   "4 завершённых боёв на арене"
  ]
 },
 {
  "id": "arena_played_6",
  "counter": "arenaPlayed",
  "min": 5,
  "target": 6,
  "name": [
   "6 Arenakämpfe beenden",
   "6 arena fights completed",
   "6 завершённых боёв на арене"
  ]
 },
 {
  "id": "searches_1",
  "counter": "searches",
  "min": 7,
  "target": 1,
  "name": [
   "1 Schrottsuche durchführen",
   "1 scrap search",
   "1 поиск лома"
  ]
 },
 {
  "id": "searches_2",
  "counter": "searches",
  "min": 7,
  "target": 2,
  "name": [
   "2 Schrottsuchen durchführen",
   "2 scrap searches",
   "2 поисков лома"
  ]
 },
 {
  "id": "searches",
  "counter": "searches",
  "min": 7,
  "target": 4,
  "name": [
   "4 Schrottsuchen durchführen",
   "4 scrap searches",
   "4 поисков лома"
  ]
 },
 {
  "id": "searches_6",
  "counter": "searches",
  "min": 7,
  "target": 6,
  "name": [
   "6 Schrottsuchen durchführen",
   "6 scrap searches",
   "6 поисков лома"
  ]
 },
 {
  "id": "sacrifices",
  "counter": "sacrifices",
  "min": 10,
  "target": 1,
  "name": [
   "1 Item in die Toilette werfen",
   "1 item thrown into the toilet",
   "1 предмет, брошенный в унитаз"
  ]
 },
 {
  "id": "sacrifices_2",
  "counter": "sacrifices",
  "min": 10,
  "target": 2,
  "name": [
   "2 Items in die Toilette werfen",
   "2 items thrown into the toilet",
   "2 предметов, брошенных в унитаз"
  ]
 },
 {
  "id": "sacrifices_3",
  "counter": "sacrifices",
  "min": 10,
  "target": 3,
  "name": [
   "3 Items in die Toilette werfen",
   "3 items thrown into the toilet",
   "3 предметов, брошенных в унитаз"
  ]
 },
 {
  "id": "expeditions_1",
  "counter": "expeditions",
  "min": 15,
  "target": 1,
  "name": [
   "1 Expedition abschließen",
   "1 expedition completed",
   "1 завершённая экспедиция"
  ]
 },
 {
  "id": "expeditions_2",
  "counter": "expeditions",
  "min": 15,
  "target": 2,
  "name": [
   "2 Expeditionen abschließen",
   "2 expeditions completed",
   "2 завершённых экспедиций"
  ]
 },
 {
  "id": "tower_2",
  "counter": "tower",
  "min": 25,
  "target": 2,
  "name": [
   "2 Turmetagen abschließen",
   "2 tower floors cleared",
   "2 пройденных этажей башни"
  ]
 },
 {
  "id": "tower_5",
  "counter": "tower",
  "min": 25,
  "target": 5,
  "name": [
   "5 Turmetagen abschließen",
   "5 tower floors cleared",
   "5 пройденных этажей башни"
  ]
 },
 {
  "id": "excavations_1",
  "counter": "excavations",
  "min": 30,
  "target": 1,
  "name": [
   "1 Abbauversuch in der Kristallmine",
   "1 crystal mining attempt",
   "1 попытка добычи в шахте"
  ]
 },
 {
  "id": "excavations",
  "counter": "excavations",
  "min": 30,
  "target": 3,
  "name": [
   "3 Abbauversuche in der Kristallmine",
   "3 crystal mining attempts",
   "3 попыток добычи в шахте"
  ]
 },
 {
  "id": "excavations_5",
  "counter": "excavations",
  "min": 30,
  "target": 5,
  "name": [
   "5 Abbauversuche in der Kristallmine",
   "5 crystal mining attempts",
   "5 попыток добычи в шахте"
  ]
 }
];
function kwBoardSelect(day,level){let groups=[...new Set(KW_BOARD_POOL.filter(t=>level>=t.min).map(t=>t.counter))];if(groups.length<10)return [];return Array.from({length:10},(_,i)=>{let k=((day+i)%groups.length+groups.length)%groups.length,variants=KW_BOARD_POOL.filter(t=>t.counter===groups[k]&&level>=t.min);return variants[((day+k+Math.floor(day/groups.length))%variants.length+variants.length)%variants.length]})}
function kwBoardLegacyTasks(level){return ['wins','arena','training','shifts','memory','rooms','purchases','missions',level>=7?'searches':'wins_more',level>=30?'excavations':level>=10?'sacrifices':'arena_more'].map(id=>KW_BOARD_POOL.find(t=>t.id===id))}
function kwBoardTasks(){let b=kwActivityState().board;return (b.taskIds||kwBoardLegacyTasks(b.level).map(t=>t.id)).map(id=>KW_BOARD_POOL.find(t=>t.id===id)).filter(Boolean)}
function kwBoardProgress(t){let b=kwActivityState().board,id=t.counter||t.id;return Math.max(0,Math.min(t.target,(kwActivityCounters()[id]||0)-(b.base[id]||0)))}
function kwBoardReward(b){return {gold:Math.round(40+12*b.level),xp:Math.round(15+4*b.level)}}
function kwBoardClaim(id){if(!kwActivityAccess('SchwarzesBrett'))return false;kwActivityTick();let b=kwActivityState().board,t=kwBoardTasks().find(x=>x.id===id);if(!t||b.claimed[id]||kwBoardProgress(t)<t.target)return false;b.claimed[id]=true;let r=kwBoardReward(b);reward(r.gold,r.xp);kwActivityFinish(hubLabel('Auftrag abgeschlossen.','Task completed.','Задание выполнено.'));return true}
function kwMarketOffers(day){let targets=['oil','wire','electronics','precision'],sources=['scrap','bolts','rubber','tape'];return targets.map((key,i)=>({key,source:sources[((day%4)+4+i)%4],qty:key==='precision'?5:3,gold:key==='precision'?500:200}))}
function kwMarketTrade(index){if(!kwActivityAccess('Schwarzmarkt')||!Number.isInteger(index))return false;kwActivityTick();let a=kwActivityState(),m=a.market,o=kwMarketOffers(m.day)[index];if(a.pending||a.encounter||!o||(m.bought[index]||0)>=3||s.gold<o.gold||!canAddOneMaterial(o.key)||materialCount(o.source)<o.qty)return false;if(!consumeMaterials({[o.source]:o.qty}))return false;s.gold-=o.gold;m.bought[index]=(m.bought[index]||0)+1;kwActivityFind(o.key,1);return true}
function kwActivityPending(){let p=kwActivityState().pending;return p?'<div class="panel row"><b>'+materialName(p.key)+' ×'+p.qty+'</b><button onclick="kwActivityClaim()">'+hubLabel('Fund abholen','Collect find','Забрать находку')+'</button></div>':''}
function kwActivityView(id){let L=hubLabel,a=kwActivityState(),out='<div class="panel stack"><h3>'+L(...KW_ACTIVITY_NAMES[id])+'</h3>';if(id==='Schrottplatz'||id==='Kristallmine')out+='<img style="width:100%;height:clamp(64px,15vh,115px);object-fit:cover;border-radius:8px" src="'+kwActivityArt(id==='Schrottplatz'?'scrapyard':'mine')+'" alt="">';kwActivityTick();if(a.encounter&&['Schrottplatz','Kristallmine','Schwarzmarkt'].includes(id))return out+'</div>'+kwActivityPending()+kwActivityEncounterPanel(id);if(id==='Schrottplatz'){out+='<small>'+L('Aktive Materialsuche. Funde nicht garantiert · 30 % Gegnerchance.','Active material hunting. Finds not guaranteed · 30% enemy chance.','Находки не гарантированы · 30% шанс противника.')+'</small><small>'+L('Suchen','Searches','Поиски')+': '+fmt(a.searches)+'</small></div>'+kwActivityPending()+'<div class="grow stack" style="overflow:auto">'+KW_SCRAP_OPTIONS.map((o,i)=>'<div class="panel row"><img style="width:54px;height:54px;object-fit:cover;border-radius:7px" src="'+kwActivityArt(['scrapyard','electronics','container'][i])+'" alt=""><div><b>'+L(...o.name)+(s.level<(o.min||7)?' · Lv '+o.min:'')+'</b><small> · ⚡ '+o.cost+'</small></div><button onclick="kwScrapSearch('+i+')" '+(s.energy<o.cost||a.pending||s.level<(o.min||7)?'disabled':'')+'>'+L('Suchen','Search','Искать')+'</button></div>').join('')+'</div>'}
else if(id==='Kristallmine'){let p=kwMinePrice(a.tool);out+='<small>'+L('Werkzeug','Tool','Инструмент')+' '+a.tool+'/10 · '+L('Abbauversuche','Excavations','Попытки')+': '+fmt(a.excavations)+'</small><small>'+L('Kristalle sind selten · 30 % Gegnerchance.','Crystals are rare · 30% enemy chance.','Кристаллы редки · 30% шанс противника.')+'</small></div>'+kwActivityPending()+'<div class="panel stack">'+KW_MINE_DEPTHS.map((d,i)=>'<div class="row"><b>'+L(...d.name)+'</b><button onclick="kwMineDig('+i+')" '+(s.energy<d.cost||a.pending||a.tool<d.tool?'disabled':'')+'>'+(a.tool<d.tool?L('Werkzeug','Tool','Инструмент')+' '+d.tool:L('Abbauen','Mine','Добывать')+' · ⚡ '+d.cost)+'</button></div>').join('')+'<div class="row"><img style="width:48px;height:48px;object-fit:cover;border-radius:7px" src="'+kwActivityArt('pickaxe')+'" alt=""><b>'+L('Werkzeug verbessern','Upgrade tool','Улучшить инструмент')+'</b></div><small>$'+fmt(p.gold)+' · '+Object.entries(p.req).map(([k,n])=>materialName(k)+' '+materialCount(k)+'/'+n).join(' · ')+'</small><button onclick="kwMineUpgrade()" '+(a.tool>=10||s.gold<p.gold||!Object.entries(p.req).every(([k,n])=>materialCount(k)>=n)?'disabled':'')+'>'+L('Ausbauen','Upgrade','Улучшить')+'</button></div>'}
else if(id==='SchwarzesBrett'){let b=a.board,r=kwBoardReward(b),tasks=kwBoardTasks();out+='<small>'+L('Tagesaufträge · Reset 00:00 UTC','Daily tasks · reset 00:00 UTC','Сброс 00:00 UTC')+' · '+tasks.filter(t=>b.claimed[t.id]).length+'/'+tasks.length+'</small></div><div class="grow stack" style="overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;touch-action:pan-y">'+tasks.map(t=>{let n=kwBoardProgress(t);return '<div class="panel stack" style="flex-shrink:0"><b>'+L(...t.name)+'</b><small>'+n+'/'+t.target+' · $'+fmt(r.gold)+' · '+fmt(r.xp)+' XP</small><div class="bar"><i style="width:'+100*n/t.target+'%"></i></div><button onclick="kwBoardClaim(\''+t.id+'\')" '+(b.claimed[t.id]||n<t.target?'disabled':'')+'>'+ (b.claimed[t.id]?L('Abgeholt','Claimed','Получено'):L('Abholen','Claim','Забрать'))+'</button></div>'}).join('')+'</div>'}
else {let m=a.market;out+='<small>'+L('Materialtausch · 3 Stück je Angebot und UTC-Tag','Material exchange · 3 per offer and UTC day','Обмен · 3 за предложение в сутки UTC')+'</small></div>'+kwActivityPending()+'<div class="grow stack" style="overflow:auto">'+kwMarketOffers(m.day).map((o,i)=>'<div class="panel row"><img style="width:42px;height:42px;object-fit:contain" src="'+materialArt(o.key)+'" alt=""><div><b>'+materialName(o.key)+'</b><small>'+materialName(o.source)+' ×'+o.qty+' · $'+fmt(o.gold)+' · '+(3-(m.bought[i]||0))+'/3</small></div><button onclick="kwMarketTrade('+i+')" '+(a.pending||(m.bought[i]||0)>=3||s.gold<o.gold||materialCount(o.source)<o.qty||!canAddOneMaterial(o.key)?'disabled':'')+'>'+L('Tauschen','Trade','Обменять')+'</button></div>').join('')+'</div>'}
return out+(a.last?'<small class="gold">'+logEscape(a.last)+'</small>':'')}
kwActivityRecoverEncounter();
let kwActivityClockKey='';
setInterval(()=>{kwActivityTick();if(!KW_ACTIVITY_NAMES[page]||battle?.running||onboard52||!$('modal').hidden)return;const k=page+'|'+s.energy+'|'+kwActivityDay();if(k!==kwActivityClockKey){kwActivityClockKey=k;render()}},1000);
