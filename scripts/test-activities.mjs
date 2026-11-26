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
page='SchwarzesBrett';kwActivityTick();test("incomplete task cannot claim",()=>!kwBoardClaim('wins'));s.wins+=5;
test("daily reward once",()=>kwBoardClaim('wins')&&!kwBoardClaim('wins'));
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
s.level=30;test('route menu links original art',()=>expeditionView().includes('assets/activities/expedition.webp')&&expeditionView().includes('assets/activities/scrapyard.webp'));
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
