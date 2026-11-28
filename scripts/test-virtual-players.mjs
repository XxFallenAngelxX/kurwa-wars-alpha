
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const core=read('src/engine/core/04-progression.js'), sim=read('src/engine/core/13-virtual-players.js'), inspect=read('src/engine/core/14-rank-inspection.js');
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
let activeProfile={id:'real',role:'player',name:'Real',avatar:0},profiles=[activeProfile,{id:'other',role:'player',name:'Other',avatar:1},{id:'gm_dev',role:'gm'}];function profileKey(p){return 'save:'+p.id}
const PROFILE_AVATARS=['a','b'],ARENA_COOLDOWN=600000,catalog=[['a',0],['b',1]],foeTypes=[['f']],REGULAR_POOL=[0,1];
const rand=n=>Math.floor(Math.random()*n),pick=a=>a[rand(a.length)];
const memory=new Map();function profileRead(k){return JSON.parse(memory.get(k)||'null')}function profileWrite(k,v){memory.set(k,JSON.stringify(v));return true}
function weaponClass(){return 'melee'}function itemReq(){return 1}function price(){return 50}function roomBonus(){return 0}function make(a,l,r){return {a,l,r,slot:catalog[a][1],v:[0,0,0,0,0]}}function gmAllowed(){return gm}function setInterval(){}function xpNeed(){return 100}
function fresh(){return {level:1,gold:500,xp:0,energy:100,stats:[10,10,10,10,10],rooms:Array(13).fill(0),eq:[{a:0,slot:0,v:[0,0,0,0,0]},null,null,null,null,null],wins:0}}
function totals(eq,state){return {hp:100+state.level*10,atk:20+state.stats[0],def:10,crit:.1,dodge:.05,a:state.stats}}
function combatPower(p,l){return p.hp+p.atk+l}function reduction(a,l){return a/(a+45+11*l)}
function codexCount(){return {ratio:0}}function trainCost(){return 100}
function kwMissionTerms(l,i){return {l,cost:5+i*5,g:30,x:50,duration:[10000,30000,60000][i]}}
function enemyStats(){return {hp:50,atk:10,def:0,crit:0}}
function foeKey(){return 'mob:f'}function battleDropChance(){return 0}function gearDropBaseChance(){return 0}
function kwGenerateGear(){throw Error('unexpected drop')}function profileEscape(s){return s}
`;
const apply=core.split('\n').find(x=>x.startsWith('function kwApplyProgress('));
const damage=read('src/engine/core/06-combat-world-ui.js').split('\n').find(x=>x.startsWith('function kwCombatDamage('));
const itemCode=read('src/engine/core/02-content-items.js'),weaponData=itemCode.split('\n').find(x=>x.startsWith('const KW_WEAPON_AFFIXES='));
const combatCode=read('src/engine/core/06-combat-world-ui.js'),weaponRuntime=combatCode.slice(combatCode.indexOf('function kwWeaponEffectsLabel('),combatCode.indexOf('function fightDecay('));
const gemCode=read('src/engine/core/09-gems.js'),specialCode=read('src/engine/features/03-special-loot.js'),activityCode=read('src/engine/features/08-activities.js');
const line=(c,k)=>c.split('\n').find(x=>x.startsWith(k));
const part=(c,a,b)=>c.slice(c.indexOf(a),c.indexOf(b,c.indexOf(a)+1));
const extras=[
 'function materialPool(){return [{id:"scrap"},{id:"bolts"}]}function rarity(){return 0}function rarity47(i){return i.r}function regularBase(){return 0}',
 line(combatCode,'function materialShopPrice('),
 part(combatCode,'const SHRINE_SLOTS=','function shrineDuration('),
 part(combatCode,'function shrineRecipe(','function sacrifice('),
 part(gemCode,'const GEM_FAMILIES=','const GEM_CACHE='),
 line(gemCode,'function gemId('),line(gemCode,'function gemData('),line(gemCode,'function fusionRecipe('),
 part(specialCode,'const ENCHANT47=','function set47('),
 part(specialCode,'function enchantCost47(','function enchantAffordable47('),
 line(activityCode,'function kwMarketOffers('),line(combatCode,'function pfMultiplier('),'const pfMaxMoves=15;'
].join('\n');
const out=runInNewContext(setup+extras+'\n'+apply+'\n'+damage+'\n'+weaponData+'\n'+weaponRuntime+'\n'+sim+'\n'+inspect+`
const results=[];
function test(n,f){if(!f())throw Error(n);results.push(n)}
const original=JSON.stringify(s),w=kwSimCreate(100,0);
test('100 distinct level-one synthetic characters',()=>w.players.length===100&&new Set(w.players.map(p=>p.id)).size===100&&w.players.every(p=>p.state.level===1&&p.simulated));
test('normal save untouched',()=>JSON.stringify(s)===original);
test('shared numeric progression',()=>{let p=w.players[0];kwSimAward(p,30,100);return p.state.level===2&&p.state.gold===530&&p.state.stats[0]===11});
test('persistent world round trip',()=>{if(!kwSimWrite(w))return false;kwSimSaveCache.clear();return kwSimRead().players[0].state.level===2});
test('compressed pool preserves Unicode and codex after cache loss',()=>{let x=kwSimCreate(2,0);x.players[0].name='Ёлка – ÄÖß 😀';x.players[0].state.codex.items['Äther']=true;x.players[1].state.codex.foes['mob:Бобр']=true;let before=JSON.stringify(x),packed=kwSimCompress(kwSimPackWorld(x));return JSON.stringify(kwSimUnpackWorld(kwSimDecompress(packed)))===before});
test('codex bitsets preserve discovery sets regardless of insertion order',()=>{let w=kwSimCreate(2,0);w.players[0].state.codex.items={a:true,b:true};w.players[1].state.codex.items={b:true,a:true};let copy=kwSimUnpackWorld(kwSimDecompress(kwSimCompress(kwSimPackWorld(w))));const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;return JSON.stringify(canonical(copy))===JSON.stringify(canonical(w))});
test('1000 mature NPC storage fixture round-trips',()=>{let w=kwSimCreate(1000,0);for(let i=0;i<w.players.length;i++){let p=w.players[i],q=p.state,a=kwSimModel(p);q.level=50+i%250;q.gold=123456+i*13;q.premium=100+i%50;q.codex.items=Object.fromEntries(Array.from({length:240},(_,k)=>['item:'+((k+i)%327),true]));q.codex.foes=Object.fromEntries(Array.from({length:270},(_,k)=>['foe:'+((k+i)%405),true]));q.rooms=Array.from({length:13},(_,k)=>(i+k)%12);q.eq=Array.from({length:6},(_,k)=>({id:'gear-'+i+'-'+k,a:k%2,l:q.level-k,r:4,slot:k,v:[i%17,k,0,15,3],mods:Array.from({length:6},(_,j)=>({i:j,tier:1+i%99,roll:1,value:(i+j)%91}))}));a.material={scrap:i%500,bolts:i%300};a.counters={missions:i*11,recycled:i%200,enchants:i%21};}let packed=kwSimCompress(kwSimPackWorld(w)),copy=kwSimUnpackWorld(kwSimDecompress(packed)),canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;return copy.players.length===1000&&JSON.stringify(canonical(copy))===JSON.stringify(canonical(w))});
test('codec handles dictionary resets',()=>{let x='',r=123;for(let i=0;i<250000;i++){r=(Math.imul(r,1664525)+1013904223)>>>0;x+=String.fromCharCode(32+r%90)}let packed=kwSimCompress({x});return kwSimDecompress(packed).x===x});
test('uncompressed legacy pool remains readable',()=>{let x=kwSimCreate(2,0);x.players[0].state.level=9;profileWrite(kwSimKey(),x);kwSimSaveCache.clear();let ok=kwSimRead().players[0].state.level===9;kwSimWrite(w);return ok});
test('GM pool isolated',()=>{gm=true;let q=kwSimRead();gm=false;return q.players[0].state.level===1&&kwSimRead().players[0].state.level===2});
test('arena defeat has cooldown',()=>{let p=w.players[1];kwSimArenaResult(p,false,100);return p.state.arena.until===600100&&p.state.arena.losses===1});
test('stronger fighter wins bounded duel',()=>kwSimResolve({hp:1000,atk:1000,def:0,crit:0},1,{hp:100,atk:1,def:0,crit:0},1,()=>.5));
test('stalemate capped',()=>{let d=kwSimDuel({hp:100000,atk:1,def:0,crit:0},1,{hp:100000,atk:1,def:0,crit:0},1);while(d.winner===null)kwSimTurn(d,()=>.5);return d.turn===400});
test('catch-up bounded and respects energy',()=>kwSimAdvance(w,KW_SIM_DAY*10,4)&&w.steps===4&&w.players.every(p=>p.state.energy>=0&&p.state.energy<=100));
test('legacy pool migration retains progress',()=>{let old=kwSimCreate(2,0);delete old.paceRevision;old.steps=64;old.players[0].state.level=7;old.players[0].state.arena.wins=4;kwSimWrite(old);let migrated=kwSimRead();const ok=migrated.paceRevision===3&&migrated.recoverySteps===0&&migrated.modelStartStep===64&&migrated.players[0].state.level===7&&migrated.players[0].state.arena.wins===4;kwSimWrite(w);return ok});
test('matchmaking excludes engaged opponents',()=>{const w2=kwSimCreate(2,0),p=w2.players[0];return kwSimOpponent(w2,p,kwSimStats(p),1,0,new Set([w2.players[1].id]))===null});
test('shared damage formula',()=>kwCombatDamage(100,0,1,1,true,1)===175);
test('mythic third attack damage applies',()=>{let p={hp:1000,atk:100,def:0,crit:0,myth47:[1,0,0]},q={hp:1000,atk:1,def:0,crit:0};let d=kwSimDuel(p,1,q,1);for(let i=0;i<5;i++)kwSimTurn(d,()=>.5);return d.fighters[1].hp<680});
test('poison three nonstacking ticks',()=>{const a={},b={};kwWeaponProc({pctPoison:1},100,a,b,()=>0);kwWeaponProc({pctPoison:1},50,a,b,()=>0);return [kwWeaponDot(b)[0][1],kwWeaponDot(b)[0][1],kwWeaponDot(b)[0][1]].join(',')==='8,8,8'&&kwWeaponDot(b).length===0});
test('fire two ticks',()=>{const a={},b={};kwWeaponProc({pctFire:1},100,a,b,()=>0);return kwWeaponDot(b)[0][1]===14&&kwWeaponDot(b)[0][1]===14&&!kwWeaponDot(b).length});
test('frost and shadow expire',()=>{const a={},b={};kwWeaponProc({pctFrost:1,pctShadow:1},100,a,b,()=>0);const first=kwWeaponDodge(.2,b)===.1&&kwWeaponAttack(100,b)===90&&kwWeaponIncoming(100,b)===110;kwWeaponDecay(b);kwWeaponDecay(b);return first&&kwWeaponDodge(.2,b)===.2&&kwWeaponAttack(100,b)===100&&kwWeaponIncoming(100,b)===100});
test('holy lightning and arcane',()=>{const a={},b={};const p=kwWeaponProc({pctHoly:1,pctLightning:1,pctArcane:1},100,a,b,()=>0);return p.extra===20&&p.heal===15&&kwWeaponIncoming(100,a)===85&&kwWeaponIncoming(100,a)===100});
test('holy heals on finishing blow',()=>{const p={hp:1000,atk:100,def:0,crit:0,pctHoly:1},q={hp:10,atk:1,def:0,crit:0},d=kwSimDuel(p,1,q,1,0);d.fighters[0].hp=500;const ev=kwSimTurn(d,()=>.1);return d.winner===0&&d.fighters[0].hp>500&&ev.weaponEvents.some(([id,n])=>id==='holy'&&n>0)});
test('element effects cannot trigger on zero damage',()=>{const a={},b={};const p=kwWeaponProc({pctHoly:1,pctPoison:1,pctLightning:1},0,a,b,()=>0);return !p.heal&&!p.extra&&!p.events.length&&!Object.keys(b).length});
test('arena applies same poison to both fighters',()=>{const p={hp:1000,atk:100,def:0,crit:0,pctPoison:1},d=kwSimDuel(p,1,p,1);kwSimTurn(d,()=>.1);kwSimTurn(d,()=>.1);return d.fighters.every(f=>f.weaponFx.poison?.turns>0)});
test('two-day progression diversifies levels',()=>{const q=kwSimCreate(100,0);for(let i=0;i<192;i++)kwSimStep(q);const lv=q.players.map(p=>p.state.level),casual=q.players.filter(p=>p.style===0),hard=q.players.filter(p=>p.style===2);const mean=a=>a.reduce((n,p)=>n+p.state.level,0)/a.length;return Math.max(...lv)>3&&new Set(lv).size>3&&mean(hard)>mean(casual)&&q.players.every(p=>p.state.energy>=0&&p.state.energy<=100&&p.state.gold>=0)});
test('travel time delays XP and mission completion',()=>{let q=kwSimCreate(1,0),p=q.players[0],a=kwSimModel(p,0),old=p.state.xp;a.pending={kind:'travel',o:{l:1,cost:5,g:30,x:50,type:0},ready:KW_SIM_STEP*2};kwSimSession(p,KW_SIM_TYPES[0],0,KW_SIM_STEP,q,new Set());return p.missions===0&&p.state.xp===old&&a.travel.kind==='travel'});
test('mission difficulty responds to actual defeats',()=>{let p=kwSimCreate(1,0).players[0],a=kwSimModel(p);a.difficulty=2;kwSimFinishFight(p,{cost:15,tier:2},{won:false},0);return a.difficulty===1&&p.failed===1&&p.missions===1});
test('daily attendance is bounded',()=>{let q=kwSimCreate(100,0);return q.players.every(p=>{let slots=kwSimSchedule(p,0),[lo,hi]=KW_SIM_ATTENDANCE[p.style];return slots.length>=lo&&slots.length<=hi&&new Set(slots).size===slots.length})});
test('offline defense does not grant free rewards',()=>{let p=kwSimCreate(1,0).players[0],gold=p.state.gold,xp=p.state.xp;kwSimArenaResult(p,true,0,false);return p.state.gold===gold&&p.state.xp===xp&&p.state.arena.wins===1});
test('recycling queue settles once and awards real recipe',()=>{let p=kwSimCreate(1,0).players[0],a=kwSimModel(p),q=p.state;q.level=10;a.recycle.push({id:'a',a:0,l:10,r:0,slot:0,v:[0,0,0,0,0]});kwSimShrine(p,0,true);if(q.shrine.jobs.length!==1||q.shrine.mana!==0||a.counters.sacrifices!==1)return false;kwSimShrine(p,13*60000-1,true);if(q.shrine.mana!==0)return false;kwSimShrine(p,13*60000,true);kwSimShrine(p,13*60000,true);return q.shrine.jobs.length===0&&q.shrine.mana===12&&a.material.scrap===2&&a.counters.recycled===1});
test('fusion pays exact resources and waits for collection',()=>{let p=kwSimCreate(1,0).players[0],q=p.state,a=kwSimModel(p);q.level=20;q.gold=10000;Object.assign(a.material,{'gem:ruby:1':3,scrap:2,bolts:1});if(!kwSimFusion(p,0)||q.gold!==9750||a.material['gem:ruby:1']||a.material['gem:ruby:2'])return false;kwSimFusion(p,179999);if(a.material['gem:ruby:2'])return false;kwSimFusion(p,180000);return a.material['gem:ruby:2']===1&&a.counters.fusions===1&&!q.gemLab.job});
test('market limits three trades per offer and resets daily',()=>{let p=kwSimCreate(1,0).players[0],q=p.state,a=kwSimModel(p);q.level=40;q.gold=10000;a.material.scrap=50;for(let i=0;i<5;i++)kwSimMarket(p,0);if(a.market.bought[0]!==3||a.material.oil!==3||q.gold!==9400||a.material.scrap!==41)return false;kwSimMarket(p,1);return a.market.day===1&&a.market.bought[3]===1});
test('memory uses six pairs and bounded moves',()=>{for(let i=0;i<100;i++){let r=kwSimMemoryRound(.8);if(r.moves<6||r.moves>15||r.misses>r.moves||!r.complete&&r.moves!==15)return false}return true});
test('PvE uses enemy level for incoming armor and wounds reduce healing',()=>{let p={hp:1000,atk:10,def:100,crit:0,dodge:0,pctRegen:.1},f={hp:10000,atk:100,def:0,crit:0},b={p,foe:f,o:{l:100},turn:1,h:500,e:10000,eh:10000,phase:0,effects:{},fx:[{},{}],special:true};kwSimPveTurn(b,()=>.5);let expected=500-kwCombatDamage(100,100,100,1,false,1);if(b.h!==expected)return false;b.effects.wound=2;kwSimPveTurn(b,()=>.5);return b.h===expected+65&&b.effects.wound===1});
test('PvE boss phase and healing curse activate at original thresholds',()=>{let p={hp:10000,atk:200,def:0,crit:0,dodge:0},f={hp:1000,atk:1,def:0,crit:0},b={p,foe:f,o:{l:1},turn:0,h:10000,e:600,eh:1000,phase:0,effects:{},fx:[{},{}],special:true};kwSimPveTurn(b,()=>.5);if(b.phase!==1)return false;b.turn=7;kwSimPveTurn(b,()=>.5);return b.effects.wound===2});
test('GM factors and active save unchanged',()=>JSON.stringify(s)===original);
const beforeRank=s;s=fresh();profileWrite('kwars_rank:real',{cp:1,level:1});
test('active rank ignores stale snapshot and updates instantly',()=>{const a=kwRankLocalRecord(activeProfile).cp;s.stats[0]+=400000;return kwRankLocalRecord(activeProfile).cp-a===400000});
test('inactive rank uses saved character not stale snapshot',()=>{let q=fresh();q.stats[0]+=300;profileWrite('save:other',q);profileWrite('kwars_rank:other',{cp:1,level:1});return kwRankLocalRecord(profiles[1]).cp>300});
test('GM excluded from real ranking',()=>kwRankLocalRecord(profiles[2])===null);
test('GM reference position reflects current CP',()=>kwRankGMPosition([{p:profiles[1],r:{cp:100,level:1}}],kwRankRecord(s))===1);
test('NPC inspection copies actual XP and equipment without changing active save',()=>{let old=JSON.stringify(s),v=kwRankResolve('npc','npc_0');if(!v?.q)return false;let oldNpc=v.q.eq[0].v[0];v.q.eq[0].v[0]=999;return kwRankResolve('npc','npc_0').q.eq[0].v[0]===oldNpc&&JSON.stringify(s)===old});
test('no server inspection',()=>{serverBoot={};let x=kwRankResolve('npc','npc_0');serverBoot=null;return x===null});s=beforeRank;
results;`);
console.log('OK virtual players:',out.join('; '));
