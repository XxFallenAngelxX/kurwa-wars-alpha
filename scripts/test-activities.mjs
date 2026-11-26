import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const activity=read('src/engine/features/08-activities.js');
const core=read('src/engine/core/04-progression.js');
const gate=core.split('// Central character-level gates; vehicle contracts deliberately remain currency-only.')[1].split('function kwCombatFeature')[0];
const setup=`
let s={level:7,energy:100,gold:10000,premium:0,wins:0,arena:{wins:0}},page='Schrottplatz',battle=null,onboard52=false,inventory={},capacity=true;
let rng=.99; Math.random=()=>rng;
function setInterval(){}
function save(){} function render(){} function hubLabel(de){return de}
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
results;
`;
const result=runInNewContext(setup+gate+activity+cases);
for(const name of result)console.log('PASS '+name);
console.log(result.length+' activity regression checks passed.');
