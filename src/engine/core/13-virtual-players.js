
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
 return {version:1,paceRevision:2,recoverySteps:0,wall:now,clock:now,steps:0,players:Array.from({length:count},(_,i)=>{
  let q=i%100,t=KW_SIM_TYPES.findIndex((x,j)=>q<KW_SIM_TYPES.slice(0,j+1).reduce((a,v)=>a+v[1],0));
  let state=fresh();state.last=now;state.training=[0,0,0,0,0];state.codex={items:{},foes:{}};
  for(const it of state.eq.filter(Boolean))state.codex.items[catalog[it.a][0]]=true;
  state.arena={wins:0,losses:0,rating:0,streak:0,until:0};
  return {id:'npc_'+i,name:kwSimName(i),avatar:i%PROFILE_AVATARS.length,simulated:true,style:t,state,missions:0,failed:0,actions:0};
 })};
}
function kwSimRead(){
 if(serverBoot)return null;
 let w=profileRead(kwSimKey());
 if(w?.version===1&&Array.isArray(w.players)&&w.players.length>0&&w.players.length<=1000&&Number.isFinite(w.wall)&&Number.isFinite(w.clock)&&w.players.every(p=>p.simulated===true&&Array.isArray(p.state?.stats)&&Array.isArray(p.state?.eq)&&p.state?.arena)){if(w.paceRevision!==2){w.paceRevision=2;w.recoverySteps=Math.min(32,Math.floor(Math.max(0,w.steps||0)/2));kwSimWrite(w);}return w;}
 w=kwSimCreate();return kwSimWrite(w)?w:null;
}
function kwSimWrite(w){const ok=profileWrite(kwSimKey(),w);kwSimLastError=ok?'':'Simulation storage full/unavailable';return ok;}
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
 const i=(d.turn+d.first)%2,a=d.fighters[i],b=d.fighters[1-i],p=a.stats,q=b.stats;
 d.turn++;a.actions=(a.actions||0)+1;let damage=0,crit=false,dodge=false,weaponEvents=[];a.weaponFx??={};b.weaponFx??={};for(const [id,value] of kwWeaponDot(a.weaponFx)){const n=Math.min(a.hp,value);a.hp-=n;if(n)weaponEvents.push([id,n]);}
 if(a.bleed>0){a.hp=Math.max(0,a.hp-a.bleedDamage);a.bleed--;}
 kwSimHeal(a,p.hp*(p.pctRegen||0));
 if(a.hp>0&&b.hp>0){
  dodge=random()<kwWeaponDodge(q.dodge,b.weaponFx);
  if(!dodge){crit=random()<p.crit;const rage=1+Math.min(4,Math.floor((d.turn-1)/2)*.045);
   const ward=b.weaponFx.shrineWardUsed;
   damage=Math.min(b.hp,kwWeaponIncoming(kwCombatDamage(kwWeaponAttack(p.atk*(a.fury?1.12:1)*(a.weaken?.85:1),a.weaponFx),q.def,b.level,.85+random()*.3,crit,rage),b.weaponFx,q));
   if(!ward&&b.weaponFx.shrineWardUsed)weaponEvents.push(['shrineWard',0]);
   b.hp-=damage;kwSimHeal(a,damage*(p.pctLeech||0));
   if(b.hp>0){kwSimHeal(b,damage*(q.pctRecoup||0));if(random()<(p.pctBleed||0)){b.bleed=2;b.bleedDamage=Math.max(1,Math.floor(damage*.15))}if(random()<(p.pctWeaken||0))b.weaken=2;
    if(random()<(q.pctCounter||0)){const counter=Math.min(a.hp,Math.max(1,Math.round(q.atk*.5*(1-reduction(p.def,a.level)))));a.hp-=counter;kwSimHeal(b,counter*(q.pctLeech||0))}
    // Existing mythic periodic effects, symmetric for either arena fighter.
    if(a.hp>0&&b.hp>0&&a.actions%3===0){const m=p.myth47||[],n=q.myth47||[];if(m[0])b.hp=Math.max(0,b.hp-Math.round(damage*.18*m[0]));if(b.hp>0){if(n[1])kwSimHeal(b,q.hp*.02*n[1]);if(n[2])a.hp=Math.max(0,a.hp-Math.round(q.atk*.25*n[2]*(1-reduction(p.def,a.level))));}}
   }
   if(a.hp>0&&b.hp>0){const proc=kwWeaponProc(p,damage,a.weaponFx,b.weaponFx,random);const extra=Math.min(b.hp,proc.extra);b.hp-=extra;const shrineExtra=Math.min(b.hp,kwShrineStrike(p,damage,a.weaponFx));b.hp-=shrineExtra;if(shrineExtra)weaponEvents.push(['shrineStrike',shrineExtra]);const before=a.hp;kwSimHeal(a,proc.heal);for(const id of proc.events)weaponEvents.push([id,id==='lightning'?extra:id==='holy'?a.hp-before:0]);}
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
function kwSimArenaResult(p,won,now){
 const a=p.state.arena;
 if(won){a.wins++;a.rating++;a.streak++;let r=kwSimArenaTerms(p.state.level);kwSimAward(p,r.g,r.x)}
 else{a.losses++;a.rating=Math.max(0,a.rating-1);a.streak=0;a.until=now+ARENA_COOLDOWN;}
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
function kwSimGear(p,it){let q=p.state;if(!it)return;
 q.codex.items[catalog[it.a][0]]=true;
 let old=q.eq[it.slot],next=q.eq.slice();next[it.slot]=it;
 if(itemReq(it)<=q.level&&combatPower(totals(next,q),q.level)>kwSimCP(p)){q.eq=next;if(old)q.gold+=price(old)}
 else q.gold+=price(it);
}
function kwSimShop(p){
 const q=p.state;if(q.gold<100)return false;
 const slots=q.eq.map((it,slot)=>({slot,score:it?it.l/Math.max(1,q.level):0})).sort((a,b)=>a.score-b.score);
 const slot=slots[0].slot,pool=REGULAR_POOL.filter(id=>catalog[id][1]===slot);if(!pool.length)return false;
 const it=make(pick(pool),Math.max(1,q.level),Math.random()<.35?1:0),cost=kwSimShopCost(it,q),old=q.eq[slot],next=q.eq.slice();next[slot]=it;
 if(!Number.isFinite(cost)||cost>q.gold||itemReq(it)>q.level||combatPower(totals(next,q),q.level)<=kwSimCP(p))return false;
 q.gold-=cost;if(old)q.gold+=price(old);q.eq=next;q.codex.items[catalog[it.a][0]]=true;return true;
}
function kwSimShopCost(i,q){return Math.round((180+85*Math.pow(i.l,1.3))*[1,1.35,1.9,2.8,4.3,9][i.r]*(1-roomBonus(7,q.rooms[7])))}
function kwSimMission(p){
 const q=p.state,stats=kwSimStats(p);
 let options=[0,1,2].map(i=>kwMissionTerms(q.level,i,q.rooms)).filter(o=>q.energy>=o.cost);
 if(!options.length)return false;
 const viable=options.filter(o=>{const f=enemyStats(o),out=Math.max(1,stats.atk*(1-reduction(f.def,o.l))*(1+.75*stats.crit)),inc=Math.max(1,f.atk*(1-reduction(stats.def,q.level))*(1+.75*f.crit)*(1-(stats.dodge||0)));return Math.ceil(f.hp/out)<=Math.max(1,Math.floor(stats.hp/inc)*.82)});
 const o=p.style===4?options[0]:viable.length?viable[Math.random()<.75?viable.length-1:rand(viable.length)]:options[0];
 o.type=rand(foeTypes.length);q.energy-=o.cost;p.missions++;
 const won=kwSimResolve(stats,q.level,enemyStats(o),o.l,Math.random,0);
 if(won){q.wins++;kwSimAward(p,o.g,o.x);q.codex.foes[foeKey(o)]=true;
  if(Math.random()<battleDropChance(gearDropBaseChance(o),{p:stats,playerLevel:q.level}))kwSimGear(p,kwGenerateGear(o.l,q.level,o,0,1));
 }else p.failed++;
 return true;
}
function kwSimSession(p,style){
 const q=p.state;let activity=.80+((Number(p.id.split('_').at(-1))||0)%11)*.04;
 if(Math.random()>=Math.min(.98,style[2]*activity))return false;
 p.actions++;q.training??=[0,0,0,0,0];
 kwSimShop(p);
 const primary=weaponClass(q.eq[0])==='ranged'?2:0,attr=Math.random()<.55?primary:pick(style[4]),cost=trainCost(attr,q);
 if(q.gold>=cost){q.gold-=cost;q.stats[attr]++;q.training[attr]++}
 const count=1+rand(style[5]);for(let j=0;j<count;j++)if(!kwSimMission(p))break;
 return true;
}
function kwSimStep(w){
 w.clock+=KW_SIM_STEP;w.steps++;const used=new Set(),active=[];
 const n=w.players.length,offset=rand(n);
 for(let i=0;i<n;i++){const p=w.players[(i+offset)%n],q=p.state,style=KW_SIM_TYPES[p.style]||KW_SIM_TYPES[0];
  q.energy=Math.min(100,q.energy+Math.floor(KW_SIM_STEP/60000));
  if(kwSimSession(p,style))active.push(p);
 }
 for(const p of active){const q=p.state,style=KW_SIM_TYPES[p.style]||KW_SIM_TYPES[0];
  if(used.has(p.id)||q.arena.until>w.clock||Math.random()>=style[3])continue;
  const a=kwSimStats(p),r=kwSimOpponent(w,p,a,q.level,q.arena.rating,used);
  if(r){used.add(p.id);used.add(r.id);const won=kwSimResolve(a,q.level,kwSimStats(r),r.state.level);kwSimArenaResult(p,won,w.clock);kwSimArenaResult(r,!won,w.clock);}
 }
}
function kwSimAdvance(w,now=Date.now(),limit=4){
 if(!w)return false;
 if(now-w.wall>KW_SIM_DAY){const skip=now-KW_SIM_DAY-w.wall;w.wall+=skip;w.clock+=skip}
 const n=Math.min(limit,Math.max(0,Math.floor((now-w.wall)/KW_SIM_STEP)));
 for(let i=0;i<n;i++){kwSimStep(w);w.wall+=KW_SIM_STEP}
 // Bounded PvE recovery for old pools: no direct level grants, reset or fabricated arena records.
 const recovery=Math.min(Math.max(0,limit-n),w.recoverySteps||0);
 for(let i=0;i<recovery;i++){for(const p of w.players){const style=KW_SIM_TYPES[p.style]||KW_SIM_TYPES[0];p.state.energy=Math.min(100,p.state.energy+15);kwSimSession(p,style)}w.recoverySteps--}
 return n||recovery?kwSimWrite(w):false;
}
function kwSimOffer(state,rating,avoid=null){
 if(kwSimBusy)return null;let w=kwSimRead();if(!w)return null;kwSimAdvance(w);
 const p=kwSimOpponent(w,null,totals(state.eq,state),state.level,rating,new Set(),avoid);if(!p)return null;
 const r=kwSimArenaTerms(state.level),rival={id:p.id,name:p.name,avatar:p.avatar,role:'player',stats:kwSimStats(p),cp:kwSimCP(p),inspection:kwRankInspectionState(p.state)};
 return {...r,offeredAt:Date.now(),heroLevel:state.level,l:p.state.level,cost:0,type:p.avatar%foeTypes.length,ai:0,arena:true,bg:2,enemy:profileEscape(p.name),rival};
}
function kwSimRank(){
 if(serverBoot)return [];let w=kwSimRead();if(!w)return [];if(!kwSimBusy)kwSimAdvance(w);
 return w.players.map(p=>({p:{id:p.id,name:p.name,avatar:p.avatar,role:'player',simulated:true},r:{level:p.state.level,cp:kwSimCP(p),arenaWins:p.state.arena.wins,arenaLosses:p.state.arena.losses,bosses:0}}));
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
  let w=kwSimRead(),p=w?.players.find(p=>p.id===b.o.rival.id);if(p){kwSimArenaResult(p,!b.win,w.clock);kwSimWrite(w);}
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
 const byStyle=KW_SIM_TYPES.map((style,i)=>{let group=ps.filter(p=>p.style===i);if(!group.length)return '';let lv=group.reduce((a,p)=>a+p.state.level,0)/group.length;let won=group.reduce((a,p)=>a+p.state.arena.wins,0),lost=group.reduce((a,p)=>a+p.state.arena.losses,0);return '<div class="kwSimStyleRow" role="row"><b role="cell">'+profileEscape(style[0])+'</b><span role="cell">'+fmt(group.length)+'</span><span role="cell">'+decimal(lv)+'</span><span role="cell">'+(won+lost?fmt(100*won/(won+lost))+'%':'–')+'</span></div>'}).join('');
 const disabled=kwSimBusy||battle?.running?'disabled':'';
 const status=kwSimLastError||kwSimStatus||L('Bereit','Ready','Готово');
 return `<section class="panel kwSimPanel"><div class="kwSimHeader"><div><h3>${L('Spielersimulation','Player simulation','Симуляция игроков')} · GM</h3><small>${L('Separater Testpool','Separate test pool','Отдельный тестовый пул')}</small></div><span class="kwSimDays"><b>${decimal((w?.steps||0)/96)}</b><small>${L('Sim. Tage','Sim. days','Дни сим.')}</small></span></div><div class="kwSimMetrics">${stats.map(([label,value])=>`<div class="kwSimMetric"><small>${label}</small><b>${value}</b></div>`).join('')}</div><details class="kwSimDetails"><summary>${L('Spielertypen – Auswertung','Playstyle metrics','Статистика типов')}</summary><div class="kwSimStyleTable" role="table" aria-label="${L('Spielertypen','Playstyles','Типы игроков')}"><div class="kwSimStyleRow kwSimStyleHead" role="row"><small role="columnheader">${L('Typ','Type','Тип')}</small><small role="columnheader">NPC</small><small role="columnheader">Ø Lv</small><small role="columnheader">${L('Arena %','Arena %','Арена %')}</small></div>${byStyle}</div></details><div class="kwSimStatus ${kwSimLastError?'kwSimError':''}" role="status">${profileEscape(status)}</div><div class="kwSimControl"><b>${L('Testpool zurücksetzen','Reset test pool','Сброс тестового пула')}</b><small>${L('Alle NPC beginnen auf Level 1.','All NPCs start at level 1.','Все NPC начинают с 1 уровня.')}</small><div class="kwSimResetGrid">${[50,100,500,1000].map(n=>`<button ${disabled} onclick="kwSimReset(${n})">${fmt(n)} NPC</button>`).join('')}</div></div><div class="kwSimControl"><b>${L('Zeit vorspulen','Fast-forward time','Ускорить время')}</b><div class="kwSimTimeGrid">${[1,7,30].map(n=>`<button ${disabled} onclick="kwSimRun(${n})">+${n} ${L('T','d','д')}</button>`).join('')}</div></div></section>`;
}
function kwSimReset(count){if(!gmAllowed()||serverBoot||kwSimBusy||battle?.running||![50,100,500,1000].includes(count))return false;const w=kwSimCreate(count);if(!kwSimWrite(w)){render();return false;}arenaState().offer=null;save();kwSimStatus='Reset: '+count+' NPC';render();return true;}
function kwSimRun(days){
 if(!gmAllowed()||serverBoot||kwSimBusy||battle?.running||![1,7,30].includes(days))return false;
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
