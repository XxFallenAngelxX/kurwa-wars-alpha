
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const core=read('src/engine/core/04-progression.js'), sim=read('src/engine/core/13-virtual-players.js');
assert.match(core,/Arena:1/);
assert.match(read('src/engine/features/03-special-loot.js'),/totals=function\(eq=s\.eq,state=s\)\{let p=old47Totals\(eq,state\)/);
assert.match(read('src/engine/core/06-combat-world-ui.js'),/if\(b\.o\.rival\)\{kwSimArenaTick\(b\);return;\}/);
assert.match(read('src/engine/core/12-milestones-profiles.js'),/concat\(kwSimRank\(\)\)/);
const layout=read('src/styles/engine/13-rank-simulation.css');
assert.match(layout,/\.kwRankEntry\s*\{[^}]*flex:0 0 auto;[^}]*min-height:56px/);
assert.match(layout,/\.kwRankList\s*\{[^}]*overflow-y:auto/);
assert.match(layout,/\.kwSimResetGrid\s*\{[^}]*repeat\(2,minmax\(0,1fr\)\)/);
assert.match(layout,/\.kwSimTimeGrid\s*\{[^}]*repeat\(3,minmax\(0,1fr\)\)/);
assert.match(read('src/host/browser-ui.js'),/\.kwAchievementList,\.kwRankList,\.baggrid/);
assert.match(sim,/kwSimMetrics/);assert.match(sim,/kwSimStyleTable/);
assert.match(read('src/engine/core/12-milestones-profiles.js'),/kwRankEntry/);
const setup=`
let s={level:77,gold:4321,energy:44},serverBoot=null,gm=false,battle=null,onboard52=false,page='Held';
const PROFILE_AVATARS=['a','b'],ARENA_COOLDOWN=600000,catalog=[['a'],['b']],foeTypes=[['f']];
const rand=n=>Math.floor(Math.random()*n),pick=a=>a[rand(a.length)];
const memory=new Map();function profileRead(k){return JSON.parse(memory.get(k)||'null')}function profileWrite(k,v){memory.set(k,JSON.stringify(v));return true}
function gmAllowed(){return gm}function setInterval(){}function xpNeed(){return 100}
function fresh(){return {level:1,gold:500,xp:0,energy:100,stats:[10,10,10,10,10],rooms:Array(13).fill(0),eq:[{a:0,slot:0},null,null,null,null,null],wins:0}}
function totals(eq,state){return {hp:100+state.level*10,atk:20+state.stats[0],def:10,crit:.1,dodge:.05,a:state.stats}}
function combatPower(p,l){return p.hp+p.atk+l}function reduction(a,l){return a/(a+45+11*l)}
function codexCount(){return {ratio:0}}function trainCost(){return 100}
function kwMissionTerms(l,i){return {l,cost:5+i*5,g:30,x:50}}
function enemyStats(){return {hp:50,atk:10,def:0,crit:0}}
function foeKey(){return 'mob:f'}function battleDropChance(){return 0}function gearDropBaseChance(){return 0}
function kwGenerateGear(){throw Error('unexpected drop')}function profileEscape(s){return s}
`;
const apply=core.split('\n').find(x=>x.startsWith('function kwApplyProgress('));
const damage=read('src/engine/core/06-combat-world-ui.js').split('\n').find(x=>x.startsWith('function kwCombatDamage('));
const out=runInNewContext(setup+apply+'\n'+damage+'\n'+sim+`
const results=[];
function test(n,f){if(!f())throw Error(n);results.push(n)}
const original=JSON.stringify(s),w=kwSimCreate(100,0);
test('100 distinct level-one synthetic characters',()=>w.players.length===100&&new Set(w.players.map(p=>p.id)).size===100&&w.players.every(p=>p.state.level===1&&p.simulated));
test('normal save untouched',()=>JSON.stringify(s)===original);
test('shared numeric progression',()=>{let p=w.players[0];kwSimAward(p,30,100);return p.state.level===2&&p.state.gold===530&&p.state.stats[0]===11});
test('persistent world round trip',()=>kwSimWrite(w)&&kwSimRead().players[0].state.level===2);
test('GM pool isolated',()=>{gm=true;let q=kwSimRead();gm=false;return q.players[0].state.level===1&&kwSimRead().players[0].state.level===2});
test('arena defeat has cooldown',()=>{let p=w.players[1];kwSimArenaResult(p,false,100);return p.state.arena.until===600100&&p.state.arena.losses===1});
test('stronger fighter wins bounded duel',()=>kwSimResolve({hp:1000,atk:1000,def:0,crit:0},1,{hp:100,atk:1,def:0,crit:0},1,()=>.5));
test('stalemate capped',()=>{let d=kwSimDuel({hp:100000,atk:1,def:0,crit:0},1,{hp:100000,atk:1,def:0,crit:0},1);while(d.winner===null)kwSimTurn(d,()=>.5);return d.turn===400});
test('catch-up bounded and respects energy',()=>kwSimAdvance(w,KW_SIM_DAY*10,4)&&w.steps===4&&w.players.every(p=>p.state.energy>=0&&p.state.energy<=100));
test('matchmaking excludes engaged opponents',()=>{const w2=kwSimCreate(2,0),p=w2.players[0];return kwSimOpponent(w2,p,kwSimStats(p),1,0,new Set([w2.players[1].id]))===null});
test('shared damage formula',()=>kwCombatDamage(100,0,1,1,true,1)===175);
test('mythic third attack damage applies',()=>{let p={hp:1000,atk:100,def:0,crit:0,myth47:[1,0,0]},q={hp:1000,atk:1,def:0,crit:0};let d=kwSimDuel(p,1,q,1);for(let i=0;i<5;i++)kwSimTurn(d,()=>.5);return d.fighters[1].hp<680});
test('GM factors and active save unchanged',()=>JSON.stringify(s)===original);
results;`);
console.log('OK virtual players:',out.join('; '));
