import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const activity=read('src/engine/features/08-activities.js');
const expedition=read('src/engine/core/11-expeditions.js');
const core=read('src/engine/core/04-progression.js');
const gate=core.split('// Central character-level gates; vehicle contracts deliberately remain currency-only.')[1].split('function kwCombatFeature')[0];
const setup=`
let s={level:7,energy:100,gold:10000,premium:0,wins:0,arena:{wins:0}},page='Schrottplatz',battle=null,onboard52=false,inventory={},capacity=true;
let rng=.99; Math.random=()=>rng;let forceEncounter=false,started=0;const foeTypes=Array.from({length:100},(_,i)=>['Foe '+i]);function bagFull(){return !capacity}function start(mode){if(mode==='activity'){let o=kwActivityEnemy();if(o){started++;kwActivityState().encounter.status='fighting'}}}function battleLog(){}
function setInterval(){}
function save(){} function render(){} function hubLabel(de){return de}
function rand(n){return Math.floor(rng*n)} function fmt(n){return String(n)} function logEscape(t){return t} const parent={location:{href:'https://example.test/game/index.html'}};
function spendEnergy(n){if(s.energy<n)return false;s.energy-=n;return true}
const MATERIAL_GATES={scrap:1,bolts:1,rubber:1,tape:1,oil:8,wire:8,electronics:8,precision:25};
function materialPool(level){return Object.keys(MATERIAL_GATES).filter(k=>MATERIAL_GATES[k]<=level).map(id=>({id}))}
function materialName(k){return k} function pick(a){return a[0]}
function addMaterial(k,n){if(!capacity)return 0;inventory[k]=(inventory[k]||0)+n;return n}
function materialCount(k){return inventory[k]||0}
function canAddOneMaterial(){return capacity}
function consumeMaterials(req){if(Object.entries(req).some(([k,n])=>materialCount(k)<n))return false;for(const [k,n] of Object.entries(req))inventory[k]-=n;return true}
function reward(g,x){s.gold+=g;s.xp=(s.xp||0)+x}
const results=[];function test(n,fn){if(!fn())throw Error(n);results.push(n)}
`;
const cases=`
const originalEncounterRoll=kwActivityEncounterRoll;kwActivityEncounterRoll=()=>forceEncounter;
test("vehicles no level gate",()=>kwFeatureAllowed('Fuhrpark',1));
test("thresholds",()=>Object.entries(KW_FEATURE_LEVELS).every(([k,n])=>!kwFeatureAllowed(k,n-1)&&kwFeatureAllowed(k,n)));
test("scrap empty roll spends energy",()=>kwScrapSearch(0)&&s.energy===95&&!kwActivityState().pending&&Object.keys(inventory).length===0);
test("electronics requires level 8",()=>!kwScrapSearch(1)&&s.energy===95);
s.energy=0;test("no energy no action",()=>!kwScrapSearch(0)&&s.energy===0);s.energy=100;
rng=0;capacity=false;test("full inventory preserves pending loot",()=>kwScrapSearch(0)&&kwActivityState().pending.qty===2);
test("pending prevents new rolls",()=>!kwScrapSearch(0));capacity=true;
test("pending claim once",()=>kwActivityClaim()&&!kwActivityState().pending&&inventory.scrap===2&&!kwActivityClaim());
page='SchwarzesBrett';kwActivityTick();delete kwActivityState().board.taskIds;kwActivityTick();test("incomplete task cannot claim",()=>!kwBoardClaim('wins'));s.wins+=5;
test("daily reward once",()=>kwBoardClaim('wins')&&!kwBoardClaim('wins'));
test('pool contains fifty unique templates',()=>KW_BOARD_POOL.length===50&&new Set(KW_BOARD_POOL.map(t=>t.id)).size===50);
test('ten unique daily tasks at each unlock level',()=>[5,7,10,15,25,30,40,50].every(l=>Array.from({length:30},(_,i)=>kwBoardSelect(20000+i,l)).every(tasks=>tasks.length===10&&new Set(tasks.map(t=>t.counter)).size===10&&tasks.every(t=>t.min<=l&&Object.hasOwn(kwActivityCounters(),t.counter)))));
test('daily rotation changes and covers all fifty templates',()=>{let all=Array.from({length:365},(_,i)=>kwBoardSelect(20000+i,50).map(t=>t.id));return new Set(all.flat()).size===50&&all.slice(1).every((ids,i)=>ids.join()!==all[i].join())});
test('existing day selection survives level changes and reload',()=>{let a=kwActivityState(),ids=kwBoardTasks().map(t=>t.id).join(),level=s.level;a.board=JSON.parse(JSON.stringify(a.board));s.level=50;kwActivityTick();s.level=level;return ids===kwBoardTasks().map(t=>t.id).join()});

test('new counters do not credit old progress on migration',()=>{let a=kwActivityState(),b=a.board;delete b.base.purchases;a.purchases=12;kwActivityTick();return b.claimed.wins&&kwBoardProgress(kwBoardTasks().find(t=>t.id==='purchases'))===0});
test('new purchase counter and independent claim',()=>{kwBoardRecord('purchases');return kwBoardClaim('purchases')&&!kwBoardClaim('purchases')});
test('board contains ten nonshrinking scrollable rows',()=>{let html=kwActivityView('SchwarzesBrett');return html.includes('overflow-y:auto')&&(html.match(/flex-shrink:0/g)||[]).length===10});

s.level=29;page='Kristallmine';test("mine below gate",()=>!kwMineDig());s.level=30;
test("mine spends energy and grants crystals",()=>{let p=s.premium,e=s.energy;return kwMineDig()&&s.premium===p+2&&s.energy===e-10});
s.level=40;page='Schwarzmarkt';kwActivityTick();let offer=kwMarketOffers(kwActivityState().market.day)[0];inventory[offer.source]=100;
test("market limits 3 trades",()=>kwMarketTrade(0)&&kwMarketTrade(0)&&kwMarketTrade(0)&&!kwMarketTrade(0));
let old=kwActivityState().board;old.day--;kwActivityTick();
test("daily reset",()=>kwActivityState().board!==old&&!kwActivityState().board.claimed.wins&&kwBoardProgress(kwBoardTasks()[0])===0);
s.level=30;page='Kristallmine';s.energy=100;let a=kwActivityState();a.tool=0;
test('depth gate prevents mining without tool',()=>!kwMineDig(1)&&s.energy===100);a.tool=3;
test('violet vein charges 14 energy',()=>kwMineDig(1)&&s.energy===86);a.tool=7;
test('deep chamber charges 18 energy',()=>kwMineDig(2)&&s.energy===68);
test('mine artwork is wired',()=>kwActivityView('Kristallmine').includes('assets/activities/mine.webp')&&kwActivityView('Kristallmine').includes('assets/activities/pickaxe.webp'));
page='Expedition';s.level=14;s.energy=100;test('expedition gated below 15',()=>!expeditionStart(0)&&s.energy===100);
s.level=21;test('scrap route gated below 22',()=>!expeditionStart(1)&&s.energy===100);
s.level=30;test('route menu uses three dedicated covers',()=>['expedition','expedition-scrap','expedition-crystal'].every(key=>expeditionView().includes('assets/activities/'+key+'.webp')));
test('scrap expedition creates seven unique stages',()=>expeditionStart(1)&&s.energy===75&&expeditionState().run.ids.length===7&&new Set(expeditionState().run.ids).size===7);
let run=expeditionState().run;test('cannot retreat before stage two',()=>!expeditionWithdraw());run.step=2;run.cash=100;run.status='choice';
test('retreat keeps loot without granting completion',()=>expeditionWithdraw()&&run.status==='finished'&&run.cash===100&&expeditionState().completed===0);
test('retreat collection cannot duplicate rewards',()=>{let gold=s.gold;return expeditionCollect()&&s.gold===gold+100&&!expeditionCollect()});
test('mine expedition has eight unique stages',()=>expeditionStart(2)&&s.energy===45&&expeditionState().run.ids.length===8&&new Set(expeditionState().run.ids).size===8);
test('old expedition route falls back to Panzerheld',()=>kwExpRoute({}).level===15);
test('all event rules match event count',()=>EXP_EVENTS.length===21&&EXP_RULES.length===21&&EXP_RULES.every(r=>r[0].every(w=>w.reduce((a,b)=>a+b,0)===100)));
test('encounter probability boundary 30%',()=>{rng=.2999;let a=originalEncounterRoll();rng=.30;return a&&!originalEncounterRoll()&&KW_ACTIVITY_ENCOUNTER_CHANCE===.30});
s.level=30;page='Schrottplatz';s.energy=100;rng=0;forceEncounter=true;let prevScrap=inventory.scrap||0;
test('scrap encounter spends only gathering energy and delays loot',()=>kwScrapSearch(0)&&s.energy===95&&started===1&&kwActivityState().encounter.status==='fighting'&&(inventory.scrap||0)===prevScrap);
test('pending encounter prevents more rolls',()=>!kwScrapSearch(0)&&s.energy===95);
let b={o:kwActivityState().encounter.enemy,win:true};test('victory pays activity fund once',()=>kwActivityCompleteEncounter(b)&&inventory.scrap===prevScrap+2&&!kwActivityCompleteEncounter(b));
page='Kristallmine';let premium=s.premium;test('mine encounter holds crystals',()=>kwMineDig(0)&&s.energy===85&&s.premium===premium&&started===2);let lost={o:kwActivityState().encounter.enemy,win:false};test('defeat forfeits crystals',()=>kwActivityCompleteEncounter(lost)&&s.premium===premium);
capacity=false;page='Schrottplatz';test('full bag preserves encounter',()=>kwScrapSearch(0)&&kwActivityState().encounter.status==='ready'&&started===2);capacity=true;start('activity');test('saved encounter starts once after bag cleared',()=>started===3&&kwActivityState().encounter.status==='fighting'&&!kwActivityEnemy());kwActivityRecoverEncounter();test('reload during fight discards fund',()=>!kwActivityState().encounter);
results;
`;
const result=runInNewContext(setup+gate+expedition+activity+cases,{URL});
for(const name of result)console.log('PASS '+name);
console.log(result.length+' activity regression checks passed.');


// All offer types use only the opponent name and level, including location-prefixed and distinct quest titles.
const missionUI=read('src/engine/core/12-milestones-profiles.js');
const identityCode=missionUI.split('\n').filter(l=>l.startsWith('function kwMissionIdentity')).join('\n');
const identity=runInNewContext('function num(n){return String(n)}\n'+identityCode+'\nkwMissionIdentityMarkup');
for(const [name,enemy,l] of [
 ['Ritter Restmülltonne','Ritter Restmülltonne',4],
 ['Kristallkasematte · DJ Knochenbrecher im Tarifvertrag','DJ Knochenbrecher im Tarifvertrag',8],
 ['Bauabnahme nach dem Ableben','Untoter Bauleiter',6],
 ['Special dispatch: Enemy','Enemy',10],
 ['Задание','Противник',12],
 ['Fallback','',1]
]){
 const expected='<h3>'+(enemy||name)+' · Lv '+l+'</h3><small class="missionDesc">Beschreibung</small>';
 const actual=identity({name,enemy,l,desc:'Beschreibung'});
 if(actual!==expected)throw Error('Mission identity duplication or wrong title: '+actual);
}
if(!missionUI.includes('${kwMissionIdentityMarkup(t.o)}')||!missionUI.includes('${kwMissionIdentityMarkup(o)}'))throw Error('Mission identity not used in both views');
console.log('OK: single opponent heading for every mission type, before departure and on arrival');


// Quest dialogue changes only when a player actually selects another offer.
const pagerCode=missionUI.split('\n').find(l=>l.startsWith('function kwMissionPage('));
if(!pagerCode)throw Error('Missing mission pager');
const pagerResult=runInNewContext(`
let page='Missionen',s={},battle=null,offers=[{}, {}, {}],mp=0,voices=[],renders=0;
const AudioGame={voice:k=>voices.push(k)};function render(){renders++}
`+pagerCode+`
kwMissionPage(1);if(mp!==1||voices.length!==1||voices[0]!=='quest')throw Error('Next must refresh dialogue');
kwMissionPage(1);if(mp!==2||voices.length!==2)throw Error('Third offer must refresh dialogue');
kwMissionPage(1);if(mp!==0||voices.length!==3)throw Error('Forward wrap');
kwMissionPage(-1);if(mp!==2||voices.length!==4)throw Error('Back wrap');
s.travel={};kwMissionPage(1);if(mp!==2||voices.length!==4)throw Error('Travel dialogue must be preserved');
s.travel=null;page='Garage';kwMissionPage(-1);if(mp!==2||voices.length!==4)throw Error('Wrong page');
page='Missionen';battle={running:true};kwMissionPage(1);if(mp!==2||voices.length!==4)throw Error('Active combat');
battle=null;kwMissionPage(0);if(mp!==2||voices.length!==4||renders!==4)throw Error('Invalid step');
true;
`);
if(!pagerResult||!missionUI.includes('onclick="kwMissionPage(-1)"')||!missionUI.includes('onclick="kwMissionPage(1)"'))throw Error('Quest dialogue pager not wired');
const audio=read('src/engine/core/01-audio.js');
const npcCode=audio.split('\n').find(l=>l.trimStart().startsWith('function npcText('));
const noRepeat=runInNewContext(`
const NPC_GROUPS={quest:3},NPC_LINES={quest0:{text:'a'},quest1:{text:'b'},quest2:{text:'c'}},lastLine={};
const document={hidden:false};let page='Missionen',npcTextPersistent=false,textTimer=null,shown=[];
function clearTimeout(){}function setTimeout(){throw Error('Quest line must persist')}
function subtitle(line){shown.push(line.text)}Math.random=()=>0;
`+npcCode+`
npcText('quest');npcText('quest');npcText('quest');
shown.join(',')==='a,b,a';
`);
if(!noRepeat)throw Error('Consecutive quest dialogue repeated');
console.log('OK: quest dialogue on both arrows, no immediate repeat, travel dialogue preserved');

if(!missionUI.includes('<small class="difficulty">${difficultyLabel(o)}</small>')||missionUI.includes('Beute iLvl ca.'))throw Error('Redundant adventure loot item level');
console.log('OK: adventure difficulty without duplicate item level');


// Universal modal dismissal respects the existing visible close controls.
const modalCore=read('src/engine/core/05-materials-enemies.js');
const dismissCode=modalCore.split('\n').find(l=>l.trimStart().startsWith('function kwModalCanDismiss('));
const dismiss=runInNewContext(dismissCode+'\nkwModalCanDismiss');
const closeButton=(action='closeItem()',cls=false,disabled=false,hidden=false)=>({disabled,closest:()=>hidden?{}:null,getAttribute:()=>action,classList:{contains:k=>k==='close'&&cls}});
const modal=(buttons,hidden=false)=>({hidden,querySelectorAll:()=>buttons});
for(const [label,window,expected] of [
 ['item comparison',modal([closeButton()]),true],
 ['nested item detail',modal([closeButton("showItem('id')",true)]),true],
 ['affix detail back',modal([closeButton('enchantOpen47()',true)]),true],
 ['mandatory confirmation',modal([closeButton('commitPurchase()')]),false],
 ['disabled close',modal([closeButton('closeItem()',false,true)]),false],
 ['hidden close',modal([closeButton('closeItem()',false,false,true)]),false],
 ['closed dialog',modal([closeButton()],true),false],
 ['missing dialog',null,false]
])if(dismiss(window)!==expected)throw Error('Modal dismissal: '+label);
const hostUI=read('src/host/browser-ui.js');
const backdropCode=hostUI.split('\n').find(l=>l.trimStart().startsWith('function kwBackdropToken('));
const backdrop=runInNewContext(backdropCode+'\nkwBackdropToken');
if(backdrop({matches:()=>true,dataset:{backdropControl:'abc'}})!=='abc'||backdrop({matches:()=>false,dataset:{backdropControl:'abc'}})!==null||backdrop(null)!==null)throw Error('Backdrop only, not inner controls');
if(!hostUI.includes('token===started')||!hostUI.includes('action(ev.target,undefined,token)'))throw Error('Backdrop pointer guard or action missing');
const snapshotUI=read('src/engine/features/04-interface-updates.js');
if(!snapshotUI.includes('clone.querySelector(\'#modal\').dataset.backdropControl=token')||!snapshotUI.includes("action:'kwDismissBackdrop()'")||!snapshotUI.includes('!kwModalCanDismiss(e)'))throw Error('Backdrop capability missing');
console.log('OK: universal dismissible modal backdrop and protected required dialogs');


const attributeCore=read('src/engine/core/04-progression.js');
const tooltipCore=read('src/engine/core/06-combat-world-ui.js');
const attrHint=attributeCore.slice(attributeCore.indexOf('function damageAttributeHint('),attributeCore.indexOf('function luckRatingCap('));
const statTooltip=tooltipCore.slice(tooltipCore.indexOf('function showStatBasis('),tooltipCore.indexOf('function luckFateMarkup('));
const tooltip=runInNewContext(`
let lang=0;
const attrs=['Stärke','Geschick','Intelligenz','Ausdauer','Glück'],s={stats:[20,20,20,20,20],training:[5,5,5,5,5],level:6};
const modal={hidden:true,innerHTML:''};
function $(id){return modal}
function num(v){return String(v)}
function hubLabel(...labels){return labels[lang]}
function totals(){return {a:[42,42,42,42,42]}}
function luckFateMarkup(){return '<div data-fate="1">Fate</div>'}
`+attrHint+statTooltip+`
({render(i,l){lang=l;showStatBasis(i);return modal.innerHTML}})
`);
for(let lang=0;lang<3;lang++)for(let i=0;i<5;i++){
 const html=tooltip.render(i,lang);
 if(!html.includes('statBasisSheet')||!html.includes('<strong>42</strong>')||!html.includes('<b>10</b>')||!html.includes('<b>+22</b>')||(html.match(/class="statBasisRow"/g)||[]).length!==4||!html.includes('statBasisEffect')||!html.includes('onclick="closeItem()"')||html.includes('Alle Attribute')||(html.includes('data-fate="1"')!==(i===4)))throw Error('Attribute tooltip '+i+' locale '+lang);
}
console.log('OK: five separate attribute tooltips in DE/EN/RU, correct breakdown and luck panel');
