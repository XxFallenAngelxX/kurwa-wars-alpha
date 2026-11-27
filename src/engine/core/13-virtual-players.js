
/* Local synthetic rivals. No profile switching, real-save writes or GM multipliers. */
const KW_SIM_STEP=15*60*1000, KW_SIM_DAY=24*60*60*1000, KW_SIM_COUNT=100;
const KW_SIM_TYPES=[
 ['Casual',35,.18,.12,[0,3,4],2],['Active',30,.42,.30,[0,3,1,4],4],['Hardcore',10,.78,.44,[0,3,1,4,2],6],
 ['PvP',10,.58,.78,[0,3,1],3],['Farmer',10,.65,.10,[4,3,0],5],['Collector',5,.38,.17,[4,0,3,1],4]
];
const KW_SIM_NAMES=['Panzer','Pfand','Gurken','Schrott','Blyat','Gulasch','Kiosk','Lada','Socken','Kreisel'];
const KW_SIM_SUFFIX=['Peter','Viktor','König','Günther','Baron','Oma','Meister','Mops','Mila','Igor'];
let kwSimBusy=false,kwSimStatus='',kwSimLastError='';
function kwSimKey(){return 'kwars_sim_v1:'+ (gmAllowed()?'gm':'local')}
function kwSimName(i){return KW_SIM_NAMES[i%10]+KW_SIM_SUFFIX[Math.floor(i/10)%10]+(i>=100?' '+Math.floor(i/100):'')}
function kwSimCreate(count=KW_SIM_COUNT,now=Date.now()){
 count=Math.max(1,Math.min(1000,Math.floor(count)||KW_SIM_COUNT));
 return {version:1,paceRevision:3,modelStartStep:0,recoverySteps:0,wall:now,clock:now,steps:0,players:Array.from({length:count},(_,i)=>{
  let q=Math.floor(i*100/count),t=KW_SIM_TYPES.findIndex((x,j)=>q<KW_SIM_TYPES.slice(0,j+1).reduce((a,v)=>a+v[1],0));
  let state=fresh();state.last=now;state.training=[0,0,0,0,0];state.codex={items:{},foes:{}};
  for(const it of state.eq.filter(Boolean))state.codex.items[catalog[it.a][0]]=true;
  state.arena={wins:0,losses:0,rating:0,streak:0,until:0};
  return {id:'npc_'+i,name:kwSimName(i),avatar:i%PROFILE_AVATARS.length,simulated:true,style:t,state,missions:0,failed:0,actions:0};
 })};
}

// Pool-local codex dictionaries are independent of catalog ordering and future patches.
// A six-bit bitset per character replaces hundreds of repeated item/enemy names.
const KW_SIM_BITS='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function kwSimPackWorld(w){
 const dict={items:[],foes:[]},sets={items:new Set(),foes:new Set()};
 for(const p of w.players)for(const k of ['items','foes'])for(const n of Object.keys(p.state.codex?.[k]||{}))sets[k].add(n);
 for(const k of ['items','foes'])dict[k]=[...sets[k]];
 const bits=(map,names)=>{if(!map||Object.values(map).some(v=>v!==true))return map||{};let out='';for(let i=0;i<names.length;i+=6){let n=0;for(let j=0;j<6&&i+j<names.length;j++)if(Object.hasOwn(map,names[i+j]))n|=1<<j;out+=KW_SIM_BITS[n]}return out};
 const players=w.players.map(p=>({...p,state:{...p.state,codex:{...p.state.codex,items:bits(p.state.codex?.items,dict.items),foes:bits(p.state.codex?.foes,dict.foes)}}}));
 return {dict,world:{...w,players}};
}
function kwSimUnpackWorld(packed){
 const {dict,world}=packed;if(!dict||!Array.isArray(world?.players)||world.players.length>1000)throw Error('Invalid simulation pool');
 const decode=(v,names)=>{if(typeof v!=='string')return v||{};if(!Array.isArray(names)||v.length!==Math.ceil(names.length/6))throw Error('Invalid codex bitset');let out=Object.create(null);for(let i=0;i<v.length;i++){let mask=KW_SIM_BITS.indexOf(v[i]);if(mask<0)throw Error('Invalid codex bit');for(let j=0;j<6&&i*6+j<names.length;j++)if(mask&(1<<j))out[names[i*6+j]]=true}return out};
 for(const p of world.players)if(p.state?.codex){let c=p.state.codex;c.items=decode(c.items,dict.items);c.foes=decode(c.foes,dict.foes)}
 return world;
}
// Reversible, bounded LZW over ASCII JSON. Output code units avoid controls and surrogates.
// No dependency, network, or asynchronous storage; only the NPC pool uses this codec.
const KW_SIM_LZ_MAX=32735,KW_SIM_LZ_RESET=128;
function kwSimCompress(value){
 const raw=JSON.stringify(value).replace(/[^\x00-\x7f]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
 let dict=new Map(),next=129,prev=-1,parts=[],chunk=[];
 const emit=c=>{chunk.push(c+32);if(chunk.length>=4096){parts.push(String.fromCharCode(...chunk));chunk=[]}};
 for(let i=0;i<raw.length;i++){
  let c=raw.charCodeAt(i);if(prev<0){prev=c;continue}
  let key=prev*128+c,found=dict.get(key);if(found!==undefined){prev=found;continue}
  emit(prev);if(next<=KW_SIM_LZ_MAX)dict.set(key,next++);else{emit(KW_SIM_LZ_RESET);dict.clear();next=129}prev=c;
 }
 if(prev>=0)emit(prev);if(chunk.length)parts.push(String.fromCharCode(...chunk));
 return {codec:'kw-sim-lzw15-1',length:raw.length,data:parts.join('')};
}
function kwSimDecompress(packed){
 if(packed?.codec!=='kw-sim-lzw15-1'||!Number.isSafeInteger(packed.length)||packed.length<1||packed.length>100000000||typeof packed.data!=='string')throw Error('Invalid simulation codec');
 const out=new Uint8Array(packed.length),prefix=new Int32Array(KW_SIM_LZ_MAX+1),suffix=new Uint8Array(KW_SIM_LZ_MAX+1),stack=new Uint8Array(KW_SIM_LZ_MAX+1);
 let pos=0,next=129,prev=-1;
 const emit=v=>{if(pos>=out.length)throw Error('Simulation codec overflow');out[pos++]=v};
 for(let i=0;i<packed.data.length;i++){
  let c=packed.data.charCodeAt(i)-32;
  if(c===KW_SIM_LZ_RESET){next=129;prev=-1;continue}
  if(c<0||c>KW_SIM_LZ_MAX||c>next||(c===next&&prev<0))throw Error('Invalid simulation code');
  let special=c===next,k=special?prev:c,n=0;
  while(k>=129){if(k>=next||n>=stack.length)throw Error('Invalid simulation dictionary');stack[n++]=suffix[k];k=prefix[k]}
  if(k<0||k>=128)throw Error('Invalid simulation literal');let first=k;emit(first);while(n)emit(stack[--n]);if(special)emit(first);
  if(prev>=0&&next<=KW_SIM_LZ_MAX){prefix[next]=prev;suffix[next]=first;next++}prev=c;
 }
 if(pos!==out.length)throw Error('Truncated simulation pool');let chunks=[];for(let i=0;i<out.length;i+=8192)chunks.push(String.fromCharCode(...out.subarray(i,i+8192)));
 return JSON.parse(chunks.join(''));
}
const kwSimSaveCache=new Map();
function kwSimLoadPool(key){
 let stored=profileRead(key);if(stored?.codec!=='kw-sim-lzw15-1')return stored;
 let cache=kwSimSaveCache.get(key);if(cache?.data===stored.data&&cache.length===stored.length)return cache.world;
 let world=kwSimUnpackWorld(kwSimDecompress(stored));kwSimSaveCache.set(key,{data:stored.data,length:stored.length,world});return world;
}

function kwSimRead(){
 if(serverBoot)return null;
 let w;try{w=kwSimLoadPool(kwSimKey())}catch(e){kwSimLastError='Simulation storage unreadable: '+String(e.message||e);return null}
 if(w?.version===1&&Array.isArray(w.players)&&w.players.length>0&&w.players.length<=1000&&Number.isFinite(w.wall)&&Number.isFinite(w.clock)&&w.players.every(p=>p.simulated===true&&Array.isArray(p.state?.stats)&&Array.isArray(p.state?.eq)&&p.state?.arena)){if(w.paceRevision!==3){w.paceRevision=3;w.modelStartStep=w.steps||0;w.recoverySteps=0;for(const p of w.players){p.state.last=w.clock;delete p.sim;}kwSimWrite(w);}return w;}
 w=kwSimCreate();return kwSimWrite(w)?w:null;
}
function kwSimWrite(w){let key=kwSimKey();try{let packed=kwSimCompress(kwSimPackWorld(w)),ok=profileWrite(key,packed);if(ok)kwSimSaveCache.set(key,{data:packed.data,length:packed.length,world:w});else kwSimSaveCache.delete(key);kwSimLastError=ok?'':'Simulation storage full/unavailable';return ok}catch(e){kwSimSaveCache.delete(key);kwSimLastError='Simulation storage failed: '+String(e.message||e);return false}}
function kwSimStats(p){return totals(p.state.eq,p.state)}
function kwSimCP(p){return combatPower(kwSimStats(p),p.state.level)}
function kwSimAward(p,g,x){let q=p.state;return kwApplyProgress(q,Math.floor(g),Math.floor(x*(1+codexCount(q).ratio)))}
function kwSimHeal(f,n){if(f.hp>0)f.hp=Math.min(f.stats.hp,f.hp+Math.max(0,Math.floor(n||0)))}
function kwSimFighter(stats,level){return {stats,level,hp:stats.hp,actions:0,bleed:0,bleedDamage:0,weaken:0,fury:0,weaponFx:{}}}
function kwSimDuel(a,al,b,bl,first=0){return {fighters:[kwSimFighter(a,al),kwSimFighter(b,bl)],turn:0,first,winner:null}}
/* The same symmetric arena turn is used for NPC/NPC and human/NPC.
   Core armor reduction, crit, variance, rage and proc factors match normal combat. */
function kwSimTurn(d,random=Math.random){
 if(d.winner!==null)return null;
 const i=(d.turn+d.first)%2,a=d.fighters[i],b=d.fighters[1-i];
 // Story/special foes have the same health-triggered armor and damage phases as PvE.
 const ratio=d.fighters[1].hp/d.fighters[1].stats.hp,phase=d.special?(ratio<=.25?2:ratio<=.5?1:0):0;
 const p=i===1&&phase===2?{...a.stats,atk:a.stats.atk*1.25}:a.stats,q=i===0&&phase===1?{...b.stats,def:b.stats.def*1.35}:b.stats;
 d.turn++;a.actions=(a.actions||0)+1;let damage=0,crit=false,dodge=false,weaponEvents=[];a.weaponFx??={};b.weaponFx??={};for(const [id,value] of kwWeaponDot(a.weaponFx)){const n=Math.min(a.hp,value);a.hp-=n;if(n)weaponEvents.push([id,n]);}
 if(a.bleed>0){a.hp=Math.max(0,a.hp-a.bleedDamage);a.bleed--;}
 kwSimHeal(a,p.hp*(p.pctRegen||0));
 if(a.hp>0&&b.hp>0){
  dodge=random()<kwWeaponDodge(q.dodge,b.weaponFx);
  if(!dodge){crit=random()<p.crit;const rage=1+Math.min(4,Math.floor((d.turn-1)/2)*.045);
   const ward=b.weaponFx.shrineWardUsed;
   damage=Math.min(b.hp,kwWeaponIncoming(kwCombatDamage(kwWeaponAttack(p.atk*(a.fury?1.12:1)*(a.weaken?.85:1),a.weaponFx),q.def,b.level,.85+random()*.3,crit,rage,p.shrineCritical?.35:0),b.weaponFx,q));
   if(!ward&&b.weaponFx.shrineWardUsed)weaponEvents.push(['shrineWard',0]);
   if(q.shrineSurvival&&!b.weaponFx.shrineSurvivalUsed&&damage>=b.hp){damage=Math.max(0,b.hp-1);b.weaponFx.shrineSurvivalUsed=true;weaponEvents.push(['shrineSurvival',0])}
   b.hp-=damage;kwSimHeal(a,damage*(p.pctLeech||0));
   if(b.hp>0){kwSimHeal(b,damage*(q.pctRecoup||0));if(random()<(p.pctBleed||0)){b.bleed=2;b.bleedDamage=Math.max(1,Math.floor(damage*.15))}if(random()<(p.pctWeaken||0))b.weaken=2;
    if(random()<(q.pctCounter||0)){const counter=Math.min(a.hp,Math.max(1,Math.round(q.atk*.5*(1-reduction(p.def,a.level)))));a.hp-=counter;kwSimHeal(b,counter*(q.pctLeech||0))}
    // Existing mythic periodic effects, symmetric for either arena fighter.
    if(a.hp>0&&b.hp>0&&a.actions%3===0){const m=p.myth47||[],n=q.myth47||[];if(m[0])b.hp=Math.max(0,b.hp-Math.round(damage*.18*m[0]));if(b.hp>0){if(n[1])kwSimHeal(b,q.hp*.02*n[1]);if(n[2])a.hp=Math.max(0,a.hp-Math.round(q.atk*.25*n[2]*(1-reduction(p.def,a.level))));}}
   }
   if(a.hp>0){const proc=kwWeaponProc(p,damage,a.weaponFx,b.weaponFx,random);const extra=Math.min(b.hp,proc.extra);b.hp-=extra;if(p.shrineDouble&&random()<.20){const bonus=Math.min(b.hp,Math.max(1,Math.round(damage*.70)));b.hp-=bonus;weaponEvents.push(['shrineDouble',bonus])}const shrineExtra=Math.min(b.hp,kwShrineStrike(p,damage,a.weaponFx));b.hp-=shrineExtra;if(shrineExtra)weaponEvents.push(['shrineStrike',shrineExtra]);const before=a.hp;kwSimHeal(a,proc.heal);for(const id of proc.events)weaponEvents.push([id,id==='lightning'?extra:id==='holy'?a.hp-before:0]);}
  }
  a.fury=Math.max(0,a.fury-1);a.weaken=Math.max(0,a.weaken-1);
  if(crit&&random()<(p.pctFury||0))a.fury=2;
 }
 kwWeaponDecay(a.weaponFx);
 if(!a.hp||!b.hp)d.winner=!b.hp?i:1-i;
 // Deterministic hard ceiling prevents stalemates; resolve by remaining HP fraction.
 else if(d.turn>=400)d.winner=a.hp/p.hp>=b.hp/q.hp?i:1-i;
 return {i,damage,crit,dodge,weaponEvents};
}
function kwSimResolve(a,al,b,bl,random=Math.random,first=null){let d=kwSimDuel(a,al,b,bl,first??(random()<.5?0:1));while(d.winner===null)kwSimTurn(d,random);return d.winner===0;}
function kwSimArenaTerms(level){return {g:Math.round((26+level*13)*.45),x:Math.round((18+level*10)*.35)}}
function kwSimArenaResult(p,won,now,initiated=true){
 const a=p.state.arena;
 if(won){a.wins++;a.rating++;a.streak++;let r=kwSimArenaTerms(p.state.level);if(initiated)kwSimAward(p,r.g,r.x)}
 else{a.losses++;a.rating=Math.max(0,a.rating-1);a.streak=0;if(initiated)a.until=now+ARENA_COOLDOWN;}
}
function kwSimOpponent(w,p,stats,level,rating,used=new Set(),avoid=null){
 const pool=w.players.filter(q=>q.id!==p?.id&&!used.has(q.id)&&q.state.arena.until<=w.clock);
 if(!pool.length)return null;
 // Sample a bounded set; favor similar level, combat power and rating.
 const cp=combatPower(stats,level),eligible=pool.filter(q=>q.id!==avoid),candidates=eligible.length?eligible:pool;
 const sample=candidates.slice(),n=p?Math.min(24,sample.length):sample.length;
 for(let i=0;p&&i<n;i++){const j=i+rand(sample.length-i);[sample[i],sample[j]]=[sample[j],sample[i]]}
 const ranked=sample.slice(0,n).map(q=>({q,score:Math.abs(Math.log((kwSimCP(q)+1)/(cp+1)))+Math.abs(q.state.level-level)*.10+Math.abs(q.state.arena.rating-rating)*.018}));
 ranked.sort((a,b)=>a.score-b.score);const best=ranked[0],near=ranked.filter(x=>x.score<=best.score+.30).slice(0,6);return pick(near).q;
}

/* Revision 3: time-aware, isolated synthetic character progression.
   One wall-clock step = 15 minutes. Daily attendance is a model assumption, not telemetry.
   A pending trip can finish offline; a reward is granted only when the NPC returns and
   completes its fight. All resource changes are scoped to p.state / p.sim. */
const KW_SIM_ATTENDANCE=[[2,3],[5,8],[12,20],[6,10],[8,12],[5,8]];
const KW_SIM_COMBAT_MS=650, KW_SIM_ACTION_MS=5000;
function kwSimModel(p,now=0){
 const q=p.state;
 q.rooms??=Array(13).fill(0);q.training??=[0,0,0,0,0];q.bag??=[];q.premium??=12;
 q.d??=typeof zones==='undefined'?[]:zones.map(()=>0);q.keys??=q.d.map(()=>false);
 q.codex??={items:{},foes:{}};q.tower??=0;q.eventTower??=0;q.fairyTower??=0;q.keyPity??=0;
 let a=p.sim??={day:-1,slots:[],pending:null,travel:null,activeMs:0,engagedMs:0,material:{},reserve:[],
  counters:{},nextShop:0,shopLevel:0,nextBoss:0,board:null,lastEnergy:Number.isFinite(q.last)?q.last:now};
 if(a.pending?.kind==='travel'){a.travel=a.pending;a.pending=null}
 a.difficulty??=[0,1,1,1,0,0][p.style]??0;a.missionStreak??=0;
 return a;
}
function kwSimCount(p,key,n=1){let a=kwSimModel(p).counters;a[key]=(a[key]||0)+n}
function kwSimSchedule(p,day){
 let a=kwSimModel(p);if(a.day===day)return a.slots;
 let [lo,hi]=KW_SIM_ATTENDANCE[p.style]||KW_SIM_ATTENDANCE[0],n=lo+rand(hi-lo+1),slots=new Set();
 // Select bounded daytime blocks, clustered into short login sessions.
 let starts=Array.from({length:64},(_,i)=>i+28);
 while(slots.size<n&&starts.length){let k=rand(starts.length),v=starts.splice(k,1)[0];for(let j=0;j<Math.min(3,n-slots.size)&&v+j<92;j++)slots.add(v+j)}
 while(slots.size<n)slots.add(28+rand(64));
 a.day=day;a.slots=[...slots].sort((a,b)=>a-b);return a.slots;
}
function kwSimRegen(p,now){
 let q=p.state,a=kwSimModel(p,now),step=Math.max(1,Math.round(60000*(1-roomBonus(2,q.rooms[2]))));
 if(!Number.isFinite(a.lastEnergy)||a.lastEnergy>now)a.lastEnergy=now;
 if(q.energy>=100){q.energy=100;a.lastEnergy=now;return}
 let n=Math.floor((now-a.lastEnergy)/step);if(n>0){q.energy=Math.min(100,q.energy+n);a.lastEnergy=q.energy===100?now:a.lastEnergy+n*step}
}
function kwSimSpend(p,n,now){kwSimRegen(p,now);let q=p.state;if(q.energy<n)return false;if(q.energy===100)kwSimModel(p).lastEnergy=now;q.energy-=n;kwSimCount(p,'energySpent',n);return true}
function kwSimMat(p,key,n){
 let q=p.state,a=kwSimModel(p),m=a.material,cap=18+(q.level>=12?48+12*(q.hq?.lv?.[4]||0):0);
 let used=Object.values(m).reduce((v,k)=>v+Math.ceil(k/999),0)+a.reserve.length;
 let old=m[key]||0,space=Math.max(0,cap-used)*999+(old?Math.ceil(old/999)*999-old:0),add=Math.min(n,space);
 if(add>0)m[key]=old+add;return add;
}
function kwSimConsume(p,req){let m=kwSimModel(p).material;if(!Object.entries(req).every(([k,n])=>(m[k]||0)>=n))return false;for(const [k,n] of Object.entries(req)){m[k]-=n;if(!m[k])delete m[k]}return true}
function kwSimGear(p,it){
 let q=p.state,a=kwSimModel(p);if(!it)return;
 q.codex.items[catalog[it.a][0]]=true;let old=q.eq[it.slot],next=q.eq.slice();next[it.slot]=it;
 if(itemReq(it)<=q.level&&combatPower(totals(next,q),q.level)>kwSimCP(p)){q.eq=next;if(old)q.gold+=price(old);kwSimCount(p,'gearUpgrades');return}
 // Keep at most one promising future item per slot, instead of permanently discarding it.
 if(itemReq(it)>q.level&&itemReq(it)<=q.level+5){let k=a.reserve.findIndex(x=>x.slot===it.slot),r=a.reserve[k];if(!r||r.l<it.l){if(r){q.gold+=price(r);a.reserve[k]=it}else a.reserve.push(it);return}}
 q.gold+=price(it);
}
function kwSimReserve(p){let a=kwSimModel(p),ready=a.reserve.filter(i=>itemReq(i)<=p.state.level);a.reserve=a.reserve.filter(i=>itemReq(i)>p.state.level);for(const i of ready)kwSimGear(p,i)}
function kwSimShop(p,now){
 const q=p.state,a=kwSimModel(p);if(a.nextShop>now&&a.shopLevel===q.level)return false;
 a.nextShop=now+21600000;a.shopLevel=q.level;let best=null,cp=kwSimCP(p);
 // Six offers per refresh, same rarity distribution, price and premium probability.
 for(let k=0;k<6;k++){
  if(Math.random()<.24){if(typeof materialPool!=='function')continue;let pool=materialPool(q.level);if(!pool.length)continue;let m=pick(pool),cost=materialShopPrice(m.id,q);if(q.gold>=cost*3&&(a.material[m.id]||0)<4&&kwSimMat(p,m.id,1)){q.gold-=cost;kwSimCount(p,'purchases')}continue}
  let it=make(pick(REGULAR_POOL),Math.max(1,q.level+pick([-2,-1,0,1,2])),typeof shopRarity==='function'?shopRarity():0),premium=Math.random()<(it.r>=3?.45:.12),cost=typeof shopPrice==='function'?shopPrice(it,premium,q):kwSimShopCost(it,q);
  if(!Number.isFinite(cost)||cost>(premium?q.premium:q.gold)||itemReq(it)>q.level)continue;
  let next=q.eq.slice();next[it.slot]=it;let gain=combatPower(totals(next,q),q.level)-cp;
  if(gain>0&&(!best||gain>best.gain))best={it,cost,premium,gain};
 }
 if(!best)return false;if(best.premium)q.premium-=best.cost;else q.gold-=best.cost;kwSimGear(p,best.it);kwSimCount(p,'purchases');return true;
}
function kwSimShopCost(i,q){return Math.round((180+85*Math.pow(i.l,1.3))*[1,1.35,1.9,2.8,4.3,9][i.r]*(1-roomBonus(7,q.rooms[7])))}
function kwSimFleet(p,now,manage=false){
 let q=p.state,rules=typeof window!=='undefined'?window.kwSimFleetRules:null;
 if(!rules)return {speed:0,gold:0,xp:0,drop:0,gems:0};
 rules.init(q,now);let f=q.fleet;
 if(f.job&&f.job.end<=now){f.levels[f.job.i]++;f.job=null;kwSimCount(p,'fleetUpgrades')}
 if(manage){
  // A preference policy, not a level gate: all actual contracts are currency-only.
  let order=p.style===4?[2,3,1,0]:p.style===2?[4,3,1,0]:[1,2,0];
  if(q.vehicle<0||f.until[q.vehicle]<now+3600000){
   for(const i of order){let price=rules.price(i);if(q.gold<price.gold*2||q.premium<price.gems)continue;q.gold-=price.gold;q.premium-=price.gems;f.until[i]=Math.max(now,f.until[i])+rules.duration;q.vehicle=i;kwSimCount(p,'rentals');break}
   rules.init(q,now);
  }
  if(q.vehicle>=0&&!f.job){let i=q.vehicle,r=rules.upgrade(i,q);if(q.gold>=r.gold*3&&q.premium>=r.gems&&kwSimConsume(p,r.req)){q.gold-=r.gold;q.premium-=r.gems;f.job={i,end:now+r.duration};}}
 }
 return rules.stats(q.vehicle,q);
}
function kwSimHQAccrue(p,now){
 let q=p.state;if(q.level<12||typeof hqRates!=='function')return;let h=q.hq??={lv:[0,0,0,0,0,0],last:now,stock:{},warehouse:[],job:null};
 const accrue=t=>{let hours=Math.max(0,t-h.last)/3600000;if(!hours)return;for(let i=0;i<4;i++)for(const [k,v] of Object.entries(hqRates(i,q,h.lv))){if(v>0){let old=h.stock[k]||0;h.stock[k]=Math.max(old,Math.min(old+hours*v,Math.max(1,12*v)))}}h.last=t};
 if(h.job&&h.job.end<=now){accrue(h.job.end);h.lv[h.job.i]++;h.job=null;kwSimCount(p,'hqUpgrades')}accrue(now);
}
function kwSimJobs(p,now,manage=false){
 let q=p.state;if(q.roomJob&&q.roomJob.end<=now){q.rooms[q.roomJob.i]++;q.roomJob=null;kwSimCount(p,'rooms')}
 kwSimHQAccrue(p,now);let ride=kwSimFleet(p,now,manage);
 if(!manage)return ride;
 if(q.shift&&q.shift.end<=now){q.gold+=q.shift.pay;q.shift=null;kwSimCount(p,'shifts')}
 if(q.hq){for(const [k,v] of Object.entries(q.hq.stock)){let n=Math.floor(v);if(!n)continue;let used=k==='cash'?(q.gold+=n,n):k==='xp'?(kwSimAward(p,0,n),n):kwSimMat(p,k,n);q.hq.stock[k]-=used}
  if(!q.hq.job&&typeof hqRecipe==='function'){let order=[0,1,2,3,5,4].sort((i,j)=>q.hq.lv[i]-q.hq.lv[j]);for(const i of order){let r=hqRecipe(i,q.hq.lv,true);if(q.gold>=r.cash*2&&kwSimConsume(p,r.mats)){q.gold-=r.cash;q.hq.job={i,end:now+r.duration};break}}}}
 if(q.level>=3&&!q.roomJob&&typeof roomCost==='function'){let order=[0,2,3,5,6,1,4,7,8,10,11,9,12].sort((i,j)=>q.rooms[i]-q.rooms[j]);for(const i of order){if((i===9&&q.level<10)||(i===12&&q.level<20))continue;let cost=roomCost(i,q);if(q.gold>=cost*2&&kwSimConsume(p,roomMaterials(i,q))){q.gold-=cost;q.roomJob={i,end:now+roomDuration(i,q,true)};break}}}
 return ride;
}
function kwSimGemSocket(p){
 let q=p.state;if(q.level<20||typeof gemData!=='function'||typeof socketList!=='function')return;
 let a=kwSimModel(p),keys=Object.keys(a.material).filter(k=>gemData(k)).sort((x,y)=>gemData(y).tier-gemData(x).tier);
 for(const i of q.eq.filter(Boolean)){let j=socketList(i).indexOf(null);if(j<0)continue;let primary=weaponClass(q.eq[0])==='ranged'?2:0,k=keys.find(k=>a.material[k]>0&&[primary,3,4].includes(gemData(k).family.stat));if(!k)continue;let g=gemData(k);if(kwSimConsume(p,{[k]:1})){i.sockets[j]=k;i.v[g.family.stat]+=gemPower(g.tier);kwSimCount(p,'sockets')}}
}
function kwSimBattle(p,o,hpRatio=1){
 let q=p.state,stats=kwSimStats(p),f=enemyStats(o),d=kwSimDuel(stats,q.level,f,o.l,0);
 d.special=!!(o.d!==undefined||o.tower||(typeof MEME_FOES!=='undefined'&&MEME_FOES[o.type-MEME_START])||(typeof RETRO_MEMES!=='undefined'&&RETRO_MEMES[o.type-RETRO_FOE_START]));
 d.fighters[0].hp=Math.max(1,Math.round(stats.hp*hpRatio));while(d.winner===null)kwSimTurn(d);
 return {won:d.winner===0,turns:d.turn,hpRatio:d.fighters[0].hp/stats.hp,level:q.level,a:stats.a};
}
function kwSimDrops(p,o,result){
 let q=p.state,b={p:{a:result.a},playerLevel:result.level};
 const roll=n=>Math.random()<battleDropChance(n,b);
 if(roll(gearDropBaseChance(o)+roomBonus(3,q.rooms[3])+(o.rideDrop||0))){
  let l=o.fairy?Math.min(o.l,Math.floor(result.level/.85)-2):o.l+(o.d!==undefined?1:0),min=typeof bossLootMinimum==='function'?bossLootMinimum(o,q):0;
  let it=kwGenerateGear(Math.max(1,l),result.level,o,min,1);if(typeof lootSpecial47==='function')it=lootSpecial47(it,l,o,Math.random,result.level,1);kwSimGear(p,it);kwSimCount(p,'gearDrops')
 }
 if(roll((o.d!==undefined||o.tower?.35:.20)+roomBonus(4,q.rooms[4])+(o.rideGems||0))){let n=1+rand(3);q.premium+=n;kwSimCount(p,'crystals',n)}
 if(typeof materialPool==='function'&&roll(o.d!==undefined?.85:o.event?.25:o.tower?.40:o.cost===15?.65:o.cost===10?.40:.25)){
  let pool=materialPool(o.l);if(pool.length){let n=kwSimMat(p,pick(pool).id,o.d!==undefined?1+rand(3):o.cost===15?1+rand(2):1);kwSimCount(p,'materials',n)}
 }
 if(q.level>=20&&typeof GEM_FAMILIES!=='undefined'&&roll(o.d!==undefined?.25:o.tower?.10:o.cost===15?.16:o.cost===10?.10:.06)){let k=gemId(pick(GEM_FAMILIES).id,gemDropTier(Math.min(o.l,result.level)));kwSimCount(p,'gemDrops',kwSimMat(p,k,1))}
}
function kwSimNextKey(p){
 if(typeof zones==='undefined')return;let q=p.state,k=zones.findIndex((z,i)=>!q.keys[i]&&q.level>=z[1]&&(i===0||q.d[i-1]>=zones[i-1][2].length));
 if(k>=0&&(++q.keyPity>=3||Math.random()<.30)){q.keys[k]=true;q.keyPity=0;kwSimCount(p,'keys')}
}
function kwSimOfferMission(p,ride){
 let q=p.state,options=[0,1,2].map(i=>kwMissionTerms(q.level,i,q.rooms)).filter(o=>q.energy>=o.cost);
 if(!options.length)return null;
 // Players trade reward efficiency against risk; no perfect pre-fight oracle.
 let a=kwSimModel(p),target=p.style===4?0:a.difficulty;
 let o=options.reduce((best,x)=>x.cost/5-1<=target?x:best,options[0]);
 // An occasional harder attempt after successes; repeated failures teach the NPC to back off.
 if(p.style!==4&&a.missionStreak>=3&&Math.random()<.12)o=options[Math.min(options.length-1,options.indexOf(o)+1)];
 o.tier=o.cost/5-1;o.type=rand(foeTypes.length);o.g=Math.round(o.g*(1+ride.gold));o.x=Math.round(o.x*(1+ride.xp));o.rideDrop=ride.drop;o.rideGems=ride.gems;
 o.duration=Math.max(1000,Math.round((o.duration||10000)*(1-roomBonus(6,q.rooms[6]))*(kwSimStats(p).shrineTravel?.8:1)*(1-ride.speed)/1000)*1000);return o;
}
function kwSimSideOffer(p,now){
 let q=p.state,a=kwSimModel(p);if(typeof zones==='undefined'||a.nextBoss>now)return null;
 let i=zones.findIndex((z,k)=>q.keys[k]&&q.level>=z[1]&&q.d[k]<z[2].length&&(k===0||q.d[k-1]>=zones[k-1][2].length));
 if(i>=0&&Math.random()<.6){let k=q.d[i],z=zones[i],l=storyBossLevel(i,k);return {enemy:z[2][k][1],type:z[2][k][0],l,cost:0,g:Math.round(150+l*45),x:Math.round(80+l*18),d:i,bossIndex:k,variance:1.15}}
 if(q.level>=50&&q.fairyTower<100&&Math.random()<.25){let floor=q.fairyTower+1,l=fairyLevel(floor);return {fairy:true,tower:true,event:false,floor,l,type:((floor-1)*37+7)%foeTypes.length,cost:0,g:Math.round(180+l*65),x:Math.round(90+l*22),variance:1.18+.002*floor}}
 if(q.level>=25){let event=q.level>=35&&Math.random()<.25,n=event?q.eventTower:q.tower,l=1+Math.floor(n*1.45);return {tower:true,event,floor:n+1,l,type:event?(n*17+5)%foeTypes.length:(n%4*7+15)%foeTypes.length,cost:0,g:Math.round((100+l*35)*(1+roomBonus(11,q.rooms[11]))),x:Math.round(35+l*8),variance:1.12}}
 return null;
}
function kwSimActivity(p,now){
 if(typeof KW_SCRAP_OPTIONS==='undefined'||typeof KW_MINE_DEPTHS==='undefined')return null;
 let q=p.state,a=kwSimModel(p),mine=q.level>=30&&Math.random()<.3;if(q.level<7)return null;
 let index=0,find={},area=mine?'Kristallmine':'Schrottplatz';
 if(mine){let tool=a.tool||0,req=kwMinePrice(tool);if(tool<10&&q.gold>=req.gold*3&&kwSimConsume(p,req.req)){q.gold-=req.gold;a.tool=++tool}
  let options=KW_MINE_DEPTHS.map((v,i)=>[v,i]).filter(([v])=>tool>=v.tool&&q.energy>=v.cost);if(!options.length)return null;let [v,i]=options.at(-1);index=i;if(!kwSimSpend(p,v.cost,now))return null;kwSimCount(p,'excavations');let r=Math.random();if(r<kwMineChance(tool)+v.bonus)find.crystals=Math.random()<.10+.05*i?2:1;else if(r<.60+.04*i&&MATERIAL_GATES[v.material]<=q.level){find.key=v.material;find.qty=i===2&&Math.random()<.25?2:1}
 }else{let options=KW_SCRAP_OPTIONS.map((v,i)=>[v,i]).filter(([v])=>q.level>=(v.min||7)&&q.energy>=v.cost);if(!options.length)return null;let [v,i]=pick(options);index=i;if(!kwSimSpend(p,v.cost,now))return null;kwSimCount(p,'searches');let pool=materialPool(q.level).filter(m=>v.common?MATERIAL_GATES[m.id]===1:i===1?MATERIAL_GATES[m.id]>=8:true);if(!pool.length)pool=materialPool(q.level);if(v.bulk){let advanced=pool.filter(m=>MATERIAL_GATES[m.id]>=8);if(advanced.length&&Math.random()<.55)pool=advanced}if(pool.length&&Math.random()<v.chance){find.key=pick(pool).id;find.qty=v.bulk?3+rand(4):Math.random()<v.double?2:1}}
 if(Math.random()<KW_ACTIVITY_ENCOUNTER_CHANCE){let l=q.level,type=pick(KW_ACTIVITY_FOES[area]);return {activity:area,type,l,cost:[5,10,15][index],g:Math.round(26+13*l),x:Math.round(18+10*l),difficulty:.90+.06*index,variance:1,find}}
 kwSimFind(p,find);return {};
}
function kwSimFind(p,f){if(f?.crystals)p.state.premium+=f.crystals;if(f?.key)kwSimMat(p,f.key,f.qty)}
function kwSimExpStart(p,now){
 if(typeof KW_EXP_ROUTES==='undefined'||p.state.level<15)return false;
 let q=p.state,a=kwSimModel(p),options=KW_EXP_ROUTES.map((v,i)=>[v,i]).filter(([v])=>q.level>=v.level&&q.energy>=v.cost);if(!options.length)return false;
 let [v,route]=p.style===4?options[0]:options.at(-1);if(!kwSimSpend(p,v.cost,now))return false;
 a.expedition={route,level:q.level,step:0,ids:kwExpShuffle(v.pool).slice(0,v.length),cash:0,xp:0,mats:{},danger:v.risk,boons:0,hpRatio:1,fights:kwExpShuffle(Array.from({length:v.length-1},(_,i)=>i+1)).slice(0,Math.random()<.55?v.fights[0]:v.fights[1])};return true;
}
function kwSimExpFinish(p,won){let a=kwSimModel(p),r=a.expedition;if(!r)return;kwSimAward(p,r.cash,r.xp);for(const [k,n] of Object.entries(r.mats))kwSimMat(p,k,n);kwSimCount(p,won?'expeditions':'expeditionLosses');a.expedition=null}
function kwSimExpAdvance(p){let r=kwSimModel(p).expedition;if(++r.step>=r.ids.length)kwSimExpFinish(p,true)}
function kwSimExpChoice(p){
 let r=kwSimModel(p).expedition,v=KW_EXP_ROUTES[r.route],rule=EXP_RULES[r.ids[r.step]]||EXP_RULES[0],l=r.level+Math.floor(r.step/2),c=r.hpRatio<.7||r.danger>=3?2:Math.random()<.15?2:rand(2);
 if(c===2){r.hpRatio=Math.min(1,r.hpRatio+.18);r.xp+=Math.round((8+3*l)*(1+r.boons*.1));if(r.danger>0)r.danger--;else if(Math.random()<.2)r.boons++}
 else{let w=rule[0][c],roll=Math.random()*100;if(roll<w[0]){let pool=materialPool(Math.min(l,p.state.level)),preferred=pool.filter(m=>r.route===1?['scrap','bolts','rubber','tape','wire','electronics'].includes(m.id):r.route===2?['precision','bolts','scrap'].includes(m.id):false);if(preferred.length&&Math.random()<.65)pool=preferred;if(pool.length){let k=pick(pool).id;r.mats[k]=(r.mats[k]||0)+Math.max(1,Math.round((1+r.boons*.15)*v.bonus*(Math.random()<.18?2:1)))}}else if(roll<w[0]+w[1])r.cash+=Math.round((28+8*l)*(1+r.boons*.05)*v.bonus);else r.danger=Math.min(4,r.danger+1)}
 let forced=r.fights.includes(r.step+1),ambush=!forced&&Math.random()<.04+.05*r.danger;if(!forced&&!ambush){kwSimExpAdvance(p);return null}
 let level=r.level+Math.floor(r.step/3)+Math.floor(r.danger/2);return {expedition:true,hpRatio:r.hpRatio,type:pick(rule[1]),l:level,cost:0,g:Math.round((34+9*level)*(1+r.danger*.14)),x:Math.round((22+6*level)*(1+r.danger*.12)),difficulty:.83+.08*r.danger+.08*(r.step>=4)+.06*(ambush?1:0)+.035*r.route,variance:1.04};
}
function kwSimBoard(p,day){
 let q=p.state,a=kwSimModel(p);if(q.level<5||typeof kwBoardSelect!=='function')return;
 let counts={...a.counters,wins:q.wins||0,arena:q.arena.wins,arenaPlayed:q.arena.wins+q.arena.losses,training:q.training.reduce((n,v)=>n+v,0),tower:q.tower||0};
 if(a.board?.day!==day)a.board={day,level:q.level,base:counts,claimed:{}};
 let b=a.board;for(const task of kwBoardSelect(day,b.level)){if(!b.claimed[task.id]&&(counts[task.counter]||0)-(b.base[task.counter]||0)>=task.target){b.claimed[task.id]=true;let r=kwBoardReward(b);kwSimAward(p,r.gold,r.xp);kwSimCount(p,'boardClaims')}}
}
function kwSimFinishFight(p,o,r,now){
 let q=p.state,a=kwSimModel(p);
 if(o.expedition){if(r.won){let e=a.expedition;if(e){e.hpRatio=Math.max(.01,r.hpRatio);e.cash+=o.g;e.xp+=o.x;q.codex.foes[foeKey(o)]=true;if(e.danger>0&&Math.random()<.35)e.danger--;kwSimExpAdvance(p)}}else kwSimExpFinish(p,false);kwSimCount(p,r.won?'expeditionWins':'expeditionDefeats');return}
 let mission=o.d===undefined&&!o.tower&&!o.activity;
 if(mission){
  p.missions++;kwSimCount(p,'missionTier'+(o.tier??o.cost/5-1));
  if(!r.won){p.failed++;a.missionStreak=0;a.difficulty=Math.max(0,(o.tier??o.cost/5-1)-1);kwSimCount(p,'missionLossTier'+(o.tier??o.cost/5-1))}
  else if(++a.missionStreak>=(p.style===2?3:5)){if(p.style!==4)a.difficulty=Math.min(2,Math.max(a.difficulty,o.tier??o.cost/5-1)+1);a.missionStreak=0}
 }
 if(!r.won){if(!mission){kwSimCount(p,'sideDefeats');a.nextBoss=now+3600000}a.eventHp=1;a.eventRun=false;return}
 q.wins++;kwSimAward(p,o.g,o.x);q.codex.foes[foeKey(o)]=true;
 if(mission){kwSimCount(p,'missions');kwSimNextKey(p)}
 if(o.d!==undefined){q.d[o.d]++;kwSimCount(p,'bosses')}
 else if(o.fairy){q.fairyTower=Math.min(100,o.floor);kwSimCount(p,'fairyFloors')}
 else if(o.event){q.eventTower++;a.eventHp=Math.max(.01,r.hpRatio);a.eventRun=true;kwSimCount(p,'eventFloors')}
 else if(o.tower){q.tower++;kwSimCount(p,'towerFloors')}
 if(o.activity)kwSimFind(p,o.find);
 kwSimDrops(p,o,r);kwSimReserve(p);
}
function kwSimStartFight(p,o,now){let a=kwSimModel(p);if(!o.event){a.eventRun=false;a.eventHp=1}let r=kwSimBattle(p,o,o.expedition?o.hpRatio:o.event&&a.eventRun?(a.eventHp||1):1);a.pending={kind:'fight',o,result:r,ready:now+KW_SIM_ACTION_MS+r.turns*KW_SIM_COMBAT_MS};return a.pending.ready}
function kwSimSession(p,style,start,end,w,used,lastSlot=false){
 let q=p.state,a=kwSimModel(p,start),t=start;p.actions++;a.activeMs+=end-start;
 kwSimRegen(p,t);let ride=kwSimJobs(p,t,true);kwSimBoard(p,Math.floor(start/KW_SIM_DAY));kwSimReserve(p);kwSimShop(p,t);kwSimGemSocket(p);
 let primary=weaponClass(q.eq[0])==='ranged'?2:0,attr=Math.random()<.55?primary:pick(style[4]),cost=trainCost(attr,q);
 if(q.gold>=cost){q.gold-=cost;q.stats[attr]++;q.training[attr]++}t+=20000;
 // Arena requires an active challenger, a free time slot and a real cooldown.
 if(!a.pending&&!a.expedition&&end-t>=270000&&q.arena.until<=t&&!used.has(p.id)&&Math.random()<style[3]){
  let stats=kwSimStats(p),other=kwSimOpponent(w,p,stats,q.level,q.arena.rating,used);
  if(other){used.add(p.id);used.add(other.id);let d=kwSimDuel(stats,q.level,kwSimStats(other),other.state.level,Math.random()<.5?0:1);while(d.winner===null)kwSimTurn(d);t+=KW_SIM_ACTION_MS+d.turn*KW_SIM_COMBAT_MS;kwSimArenaResult(p,d.winner===0,t,true);kwSimArenaResult(other,d.winner!==0,t,false);kwSimCount(p,'arenaChallenges')}
 }
 for(let attempts=0;t<end&&attempts<180;attempts++){
  kwSimRegen(p,t);
  if(a.pending){
   let x=a.pending;if(x.ready>end){t=end;break}t=Math.max(t,x.ready);if(t+KW_SIM_ACTION_MS>end)break;
   a.pending=null;kwSimFinishFight(p,x.o,x.result,t);t+=KW_SIM_ACTION_MS;continue;
  }
  if(a.expedition){let o=kwSimExpChoice(p);if(o)kwSimStartFight(p,o,t);else t+=KW_SIM_ACTION_MS;continue}
  if(end-t<KW_SIM_ACTION_MS)break;
  if(a.travel&&a.travel.ready<=t){let o=a.travel.o;a.travel=null;kwSimStartFight(p,o,t);continue}
  // Continue event waves with retained HP only during one uninterrupted run.
  if(a.eventRun&&q.level>=35&&end-t>10000&&Math.random()<.7){let n=q.eventTower,l=1+Math.floor(n*1.45);kwSimStartFight(p,{tower:true,event:true,floor:n+1,l,type:(n*17+5)%foeTypes.length,cost:0,g:Math.round((100+l*35)*(1+roomBonus(11,q.rooms[11]))),x:Math.round(35+l*8),variance:1.12},t);continue}
  a.eventRun=false;a.eventHp=1;
  if(Math.random()<(p.style===2||p.style===5?.35:.15)){let side=kwSimSideOffer(p,t);if(side){kwSimStartFight(p,side,t);continue}}
  if(Math.random()<(p.style===4||p.style===5?.22:.08)){
   if(Math.random()<.35&&kwSimExpStart(p,t)){t+=KW_SIM_ACTION_MS;continue}
   let o=kwSimActivity(p,t);if(o){if(o.activity)kwSimStartFight(p,o,t);else t+=KW_SIM_ACTION_MS;continue}
  }
  if(a.travel){t=Math.min(end,Math.max(t+KW_SIM_ACTION_MS,a.travel.ready));continue}
  if(q.shift){if(q.shift.end<=t){q.gold+=q.shift.pay;q.shift=null;kwSimCount(p,'shifts')}else break}
  let o=kwSimOfferMission(p,ride);if(!o||!kwSimSpend(p,o.cost,t))break;
  a.travel={kind:'travel',o,ready:t+o.duration+KW_SIM_ACTION_MS};t+=KW_SIM_ACTION_MS;kwSimCount(p,'travelStarted');
 }
 a.engagedMs+=Math.max(0,Math.min(end,t)-start);kwSimBoard(p,Math.floor(start/KW_SIM_DAY));
 // The night shift occupies offline time and prevents starting an adventure.
 if(lastSlot&&!a.pending&&!a.travel&&!a.expedition&&!q.shift){let hours=p.style===0?8:p.style===2?4:6,pay=Math.floor(hours*(65+q.level*12+3*Math.pow(Math.max(0,q.level-20),1.4))*(1+roomBonus(8,q.rooms[8])));q.shift={end:end+hours*3600000,pay}}
 kwSimRegen(p,end);return true;
}
function kwSimStep(w){
 let start=w.clock;w.clock+=KW_SIM_STEP;w.steps++;let day=Math.floor(start/KW_SIM_DAY),slot=Math.floor(((start%KW_SIM_DAY)+KW_SIM_DAY)%KW_SIM_DAY/KW_SIM_STEP),used=new Set(),n=w.players.length,offset=rand(n);
 for(let i=0;i<n;i++){let p=w.players[(i+offset)%n],slots=kwSimSchedule(p,day);
  if(slots.includes(slot))kwSimSession(p,KW_SIM_TYPES[p.style]||KW_SIM_TYPES[0],start,w.clock,w,used,slot===slots.at(-1));
  else{kwSimRegen(p,w.clock);kwSimJobs(p,w.clock)}
 }
}
function kwSimAdvance(w,now=Date.now(),limit=4){
 if(!w)return false;
 // Never silently discard days. Catch up a bounded number of steps per invocation.
 let n=Math.min(limit,Math.max(0,Math.floor((now-w.wall)/KW_SIM_STEP)));
 for(let i=0;i<n;i++){kwSimStep(w);w.wall+=KW_SIM_STEP}
 return n?kwSimWrite(w):false;
}
function kwSimOffer(state,rating,avoid=null){
 if(kwSimBusy)return null;let w=kwSimRead();if(!w)return null;kwSimAdvance(w);
 const p=kwSimOpponent(w,null,totals(state.eq,state),state.level,rating,new Set(),avoid);if(!p)return null;
 const r=kwSimArenaTerms(state.level),rival={id:p.id,name:p.name,avatar:p.avatar,role:'player',stats:kwSimStats(p),cp:kwSimCP(p),inspection:kwRankInspectionState(p.state)};
 return {...r,offeredAt:Date.now(),heroLevel:state.level,l:p.state.level,cost:0,type:p.avatar%foeTypes.length,ai:0,arena:true,bg:2,enemy:profileEscape(p.name),rival};
}
function kwSimRank(){
 if(serverBoot)return [];let w=kwSimRead();if(!w)return [];if(!kwSimBusy)kwSimAdvance(w);
 return w.players.map(p=>({p:{id:p.id,name:p.name,avatar:p.avatar,role:'player',simulated:true},r:{level:p.state.level,cp:kwSimCP(p),arenaWins:p.state.arena.wins,arenaLosses:p.state.arena.losses,bosses:(p.state.d||[]).reduce((n,v)=>n+v,0)}}));
}
function kwSimArenaTick(b){
 b.duel??=kwSimDuel(b.p,b.playerLevel,b.foe,b.o.l,Math.random()<.5?0:1);
 const ev=kwSimTurn(b.duel),[a,r]=b.duel.fighters;
 b.turn=b.duel.turn;b.h=a.hp;b.e=r.hp;b.healPop=0;
 b.effects={fury:a.fury,bleed:r.bleed,weaken:r.weaken,wound:0};
 b.hit=ev?battleAttackFeedback(b,ev.i===0,ev.damage,ev.crit,ev.dodge):null;
 if(ev){const actor=ev.i===0?profileName():b.o.enemy;
 battleLog(b,actor+' · '+(ev.dodge?hubLabel('Ausgewichen','Dodged','Уклонение'):num(ev.damage)+' '+hubLabel('Schaden','damage','урон')+(ev.crit?' · CRIT':'')),ev.i===0?'outgoing':'incoming');for(const [id,n] of ev.weaponEvents||[])battleLog(b,kwWeaponEffectsLabel(id)+' · '+(id==='holy'?'+'+num(n)+' LP':n?num(n)+' '+hubLabel('Schaden','damage','урона'):hubLabel('Effekt aktiv','Effect active','Эффект активен')),id==='holy'?'healing':id==='arcane'||id==='shrineWard'?'buff':'debuff');}
 if(b.duel.winner!==null){
  clearInterval(timer);timer=null;b.running=false;b.win=b.duel.winner===0;b.warningUntil=0;b.dialogue45={};
  if(b.win)b.e=0;else b.h=0;
  // Record rival result once, against its saved identity, only in this pool.
  let w=kwSimRead(),p=w?.players.find(p=>p.id===b.o.rival.id);if(p){kwSimArenaResult(p,!b.win,w.clock,false);kwSimWrite(w);}
  battleLog(b,b.win?hubLabel('Gegner besiegt!','Enemy defeated!','Противник побеждён!'):hubLabel('Du wurdest besiegt.','You were defeated.','Ты проиграл.'),b.win?'outgoing':'incoming');
  battleOutcomeSound(b);finishArena(b);chat46Finish(b);save();
 }
 render();
}
function kwSimGMMarkup(){
 if(!gmAllowed()||serverBoot)return '';
 const w=kwSimRead(),ps=w?.players||[],n=ps.length,avg=n?Math.round(ps.reduce((a,p)=>a+p.state.level,0)/n*10)/10:0;
 const wins=ps.reduce((a,p)=>a+p.state.arena.wins,0),losses=ps.reduce((a,p)=>a+p.state.arena.losses,0),missions=ps.reduce((a,p)=>a+p.missions,0),failed=ps.reduce((a,p)=>a+p.failed,0);
 const L=hubLabel,decimal=v=>Number(v).toLocaleString(s.lang==='en'?'en-US':s.lang==='ru'?'ru-RU':'de-DE',{maximumFractionDigits:2});
 const stats=[[L('Spieler','Players','Игроки'),fmt(n)],[L('Ø Level','Avg. level','Ср. уровень'),decimal(avg)],[L('Missionen','Missions','Задания'),fmt(missions)],[L('PvE-Siegquote','PvE win rate','Победы PvE'),missions?fmt(100*(missions-failed)/missions)+'%':'–'],[L('Arena-Siege','Arena wins','Победы арены'),fmt(wins)],[L('Arena-Niederlagen','Arena losses','Поражения арены'),fmt(losses)]];
 const totalCounter=k=>ps.reduce((n,p)=>n+(p.sim?.counters?.[k]||0),0),modelDays=Math.max(0,((w?.steps||0)-(w?.modelStartStep||0))/96);stats.push([L('Ø aktive Minuten/Tag','Avg. active min/day','Ср. активных мин/день'),modelDays&&n?decimal(ps.reduce((t,p)=>t+(p.sim?.activeMs||0),0)/60000/n/modelDays):'–'],[L('Dungeon-Bosse','Dungeon bosses','Боссы'),fmt(totalCounter('bosses'))],[L('Expeditionen','Expeditions','Экспедиции'),fmt(totalCounter('expeditions'))],[L('Ausbau abgeschlossen','Completed upgrades','Улучшения'),fmt(totalCounter('rooms')+totalCounter('hqUpgrades')+totalCounter('fleetUpgrades'))],[L('Tagesaufträge','Daily tasks','Задания'),fmt(totalCounter('boardClaims'))],[L('Ausrüstungswechsel','Gear upgrades','Смена экипировки'),fmt(totalCounter('gearUpgrades'))]);
 const byStyle=KW_SIM_TYPES.map((style,i)=>{let group=ps.filter(p=>p.style===i);if(!group.length)return '';let lv=group.reduce((a,p)=>a+p.state.level,0)/group.length;let won=group.reduce((a,p)=>a+p.state.arena.wins,0),lost=group.reduce((a,p)=>a+p.state.arena.losses,0);return '<div class="kwSimStyleRow" role="row"><b role="cell">'+profileEscape(style[0])+'</b><span role="cell">'+fmt(group.length)+'</span><span role="cell">'+decimal(lv)+'</span><span role="cell">'+(won+lost?fmt(100*won/(won+lost))+'%':'–')+'</span></div>'}).join('');
 const disabled=kwSimBusy||battle?.running?'disabled':'';
 const status=kwSimLastError||kwSimStatus||L('Bereit','Ready','Готово');
 return `<section class="panel kwSimPanel"><div class="kwSimHeader"><div><h3>${L('Spielersimulation','Player simulation','Симуляция игроков')} · GM</h3><small>${L('Separater Testpool','Separate test pool','Отдельный тестовый пул')}</small></div><span class="kwSimDays"><b>${decimal((w?.steps||0)/96)}</b><small>${L('Sim. Tage','Sim. days','Дни сим.')}</small></span></div><div class="kwSimMetrics">${stats.map(([label,value])=>`<div class="kwSimMetric"><small>${label}</small><b>${value}</b></div>`).join('')}</div><details class="kwSimDetails"><summary>${L('Spielertypen – Auswertung','Playstyle metrics','Статистика типов')}</summary><div class="kwSimStyleTable" role="table" aria-label="${L('Spielertypen','Playstyles','Типы игроков')}"><div class="kwSimStyleRow kwSimStyleHead" role="row"><small role="columnheader">${L('Typ','Type','Тип')}</small><small role="columnheader">NPC</small><small role="columnheader">Ø Lv</small><small role="columnheader">${L('Arena %','Arena %','Арена %')}</small></div>${byStyle}</div></details><div class="kwSimStatus ${kwSimLastError?'kwSimError':''}" role="status">${profileEscape(status)}</div><div class="kwSimControl"><b>${L('Testpool zurücksetzen','Reset test pool','Сброс тестового пула')}</b><small>${L('Alle NPC beginnen auf Level 1.','All NPCs start at level 1.','Все NPC начинают с 1 уровня.')}</small><div class="kwSimResetGrid">${[50,100,500,1000].map(n=>`<button ${disabled} onclick="kwSimReset(${n})">${fmt(n)} NPC</button>`).join('')}</div></div><div class="kwSimControl"><b>${L('Zeit vorspulen','Fast-forward time','Ускорить время')}</b><div class="kwSimTimeGrid">${[1,7,30,60,90].map(n=>`<button ${disabled} onclick="kwSimRun(${n})">+${n} ${L('T','d','д')}</button>`).join('')}</div></div></section>`;
}
function kwSimReset(count){if(!gmAllowed()||serverBoot||kwSimBusy||battle?.running||![50,100,500,1000].includes(count))return false;const w=kwSimCreate(count);if(!kwSimWrite(w)){render();return false;}arenaState().offer=null;save();kwSimStatus='Reset: '+count+' NPC';render();return true;}
function kwSimRun(days){
 if(!gmAllowed()||serverBoot||kwSimBusy||battle?.running||![1,7,30,60,90].includes(days))return false;
 let w=kwSimRead();if(!w)return false;let remaining=days*96,total=remaining;kwSimBusy=true;kwSimStatus='Simulation running';render();
 function batch(){
  if(!gmAllowed()){kwSimBusy=false;return}
  try{
   const end=Date.now()+18;
   do{kwSimStep(w);remaining--;}while(remaining>0&&Date.now()<end);
   if(remaining>0){kwSimStatus='Simulation '+Math.floor(100*(total-remaining)/total)+'%';setTimeout(batch,0);return}
   kwSimStatus=kwSimWrite(w)?'Completed: +'+days+' days':'Save failed';
   arenaState().offer=null;save();
  }catch(e){kwSimStatus='Simulation failed: '+String(e.message||e)}
  kwSimBusy=false;render();
 }
 setTimeout(batch,0);return true;
}
// Cheap, bounded catch-up; never advance a pool while its real arena duel is open.
setInterval(()=>{if(serverBoot||onboard52||kwSimBusy||battle?.running)return;
 const w=kwSimRead();if(w&&(Date.now()-w.wall>=KW_SIM_STEP||w.recoverySteps>0)&&kwSimAdvance(w)&&['Rangliste','Arena'].includes(page))render();
},15000);
