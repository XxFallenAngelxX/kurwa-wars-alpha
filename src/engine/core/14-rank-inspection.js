
/* Read-only character inspection and live local ranking. Never switch active profiles. */
function kwRankValidState(q){
 return !!q&&Number.isFinite(q.level)&&q.level>=1&&Array.isArray(q.stats)&&q.stats.length===5&&q.stats.every(Number.isFinite)&&Array.isArray(q.eq)&&q.eq.length===6&&q.eq.every(i=>!i||(Array.isArray(i.v)&&i.v.length===5&&i.v.every(Number.isFinite)&&Number.isInteger(i.a)&&!!catalog[i.a]));
}
function kwRankInspectionState(q){
 if(!kwRankValidState(q))return null;
 return {level:q.level,xp:Math.max(0,Number(q.xp)||0),stats:q.stats.slice(),eq:JSON.parse(JSON.stringify(q.eq)),rooms:Array.from({length:13},(_,i)=>Math.max(0,Number(q.rooms?.[i])||0)),wins:Number(q.wins)||0,tower:Number(q.tower)||0,fairyTower:Number(q.fairyTower)||0,d:Array.isArray(q.d)?q.d.slice():[],arena:{wins:Number(q.arena?.wins)||0,losses:Number(q.arena?.losses)||0,rating:Number(q.arena?.rating)||0}};
}
function kwRankRecord(q){
 if(!kwRankValidState(q))return null;
 try{
  const state=Array.isArray(q.rooms)&&q.rooms.length>=13?q:{...q,rooms:Array.from({length:13},(_,i)=>Number(q.rooms?.[i])||0)};
  const cp=combatPower(totals(state.eq,state),state.level);
  if(!Number.isFinite(cp))return null;
  return {level:state.level,cp,xp:Math.max(0,Number(state.xp)||0),wins:Number(state.wins)||0,tower:Number(state.tower)||0,fairy:Number(state.fairyTower)||0,bosses:Array.isArray(state.d)?state.d.reduce((a,b)=>a+(Number(b)||0),0):0,arenaWins:Number(state.arena?.wins)||0,arenaLosses:Number(state.arena?.losses)||0};
 }catch{return null}
}
function kwRankLocalRecord(p){
 if(p.role!=='player')return null;
 // Active character is authoritative; inactive local profiles use the actual saved state.
 const live=kwRankRecord(p.id===activeProfile.id?s:profileRead(profileKey(p)));
 if(live)return live;
 const old=profileRead('kwars_rank:'+p.id);
 return old&&Number.isFinite(old.cp)&&Number.isFinite(old.level)?old:null;
}
function kwRankCompare(a,b){return b.r.cp-a.r.cp||b.r.level-a.r.level||a.p.id.localeCompare(b.p.id)}
function kwRankGMPosition(list,r){return 1+list.filter(x=>kwRankCompare(x,{p:activeProfile,r})<0).length}
function kwRankGMReference(list){
 if(!gmAllowed())return '';
 const r=kwRankRecord(s);if(!r)return '';
 const position=kwRankGMPosition(list,r);
 return `<button type="button" class="panel kwRankEntry kwRankSelf kwRankGM" onclick="kwRankInspect('gm','gm_dev')"><b class="kwRankPosition">GM</b><img class="kwRankAvatar" src="${profileArt(activeProfile)}" alt=""><div class="kwRankIdentity"><div class="kwRankName"><b>${profileNameHtml()}</b><small class="kwRankNPC">GM</small></div><small>Lv ${fmt(r.level)} · ${fmt(r.cp)} CP</small><small>${hubLabel('Nur Vergleich · nicht gewertet','Comparison only · unranked','Только сравнение · вне рейтинга')}</small></div><div class="kwRankRecord"><b>≈ #${fmt(position)}</b><small>${hubLabel('Testplatz','Test rank','Тест. место')}</small></div></button>`;
}
function kwRankRefresh(){
 if(serverBoot||page!=='Rangliste'||battle?.running)return false;
 profileSnapshot();render();return true;
}
function kwRankResolve(kind,id){
 if(serverBoot||!['npc','arena','player','gm'].includes(kind)||typeof id!=='string'||!/^[a-z0-9_-]+$/.test(id))return null;
 if(kind==='gm')return gmAllowed()&&id===activeProfile.id?{p:activeProfile,q:kwRankInspectionState(s)}:null;
 if(kind==='player'){
  const p=profiles.find(p=>p.id===id&&p.role==='player');if(!p)return null;
  return {p,q:kwRankInspectionState(id===activeProfile.id?s:profileRead(profileKey(p))),r:kwRankLocalRecord(p)};
 }
 if(kind==='arena'){
  const o=arenaState().offer;if(!o?.rival||o.rival.id!==id||!o.rival.inspection)return null;
  return {p:{...o.rival,simulated:true},q:kwRankInspectionState(o.rival.inspection),stats:o.rival.stats,r:{cp:o.rival.cp,level:o.l},arena:true};
 }
 const w=kwSimRead(),p=w?.players.find(p=>p.id===id);
 return p?{p:{id:p.id,name:p.name,avatar:p.avatar,role:'player',simulated:true},q:kwRankInspectionState(p.state)}:null;
}
function kwRankGearMarkup(q){
 const L=hubLabel;
 return q.eq.map((it,i)=>{
  const label=profileEscape(slots[i]);
  if(!it)return `<div class="kwInspectEmpty"><small>${label}</small><span>—</span></div>`;
  const mods=[...it.v.map((v,k)=>[attrs[k],v]),[L('Schaden','Damage','Урон'),it.atk],[L('Rüstung','Armor','Броня'),it.def],[L('Leben','Health','Здоровье'),it.hp]].filter(([,v])=>Number.isFinite(v)&&v!==0);
  const perc=[['crit',L('Krit','Crit','Крит')],['pctAtk',L('Schaden','Damage','Урон')],['pctDef',L('Rüstung','Armor','Броня')],['pctHp',L('Leben','Health','Здоровье')],...combatMods.map(m=>[m[0],combatLabel(m)])].filter(([k])=>Number.isFinite(it[k])&&it[k]!==0);
  return `<details class="kwInspectGear"><summary><img src="${itemArt(it)}" alt=""><span><small>${label} · iLvl ${fmt(it.l)}</small><b style="color:${qualityColor52(it)}">${profileEscape(name(it))}</b><small>${profileEscape(qualityName52(it))}</small></span></summary><div class="kwInspectAffixes">${mods.map(([n,v])=>`<small>${profileEscape(n)}: +${fmt(v)}</small>`).join('')}${perc.map(([k,n])=>`<small>${profileEscape(n)}: +${Math.round(it[k]*10000)/100}%</small>`).join('')||''}</div></details>`;
 }).join('');
}
function kwRankInspect(kind,id){
 if(serverBoot||battle?.running||!['Rangliste','Arena'].includes(page)||(kind==='arena'&&page!=='Arena'))return false;
 const v=kwRankResolve(kind,id);if(!v)return false;
 const L=hubLabel,p=v.p,q=v.q,r=q?kwRankRecord(q):v.r;
 if(!r)return false;
 const stats=q?(v.stats||totals(q.eq,q)):null,cp=v.arena?v.r.cp:r.cp,need=q?xpNeed(q.level):0,ratio=need?clamp(100*q.xp/need,0,100):0;
 const head=`<div class="kwInspectHead"><img src="${profileArt(p)}" alt=""><div><h3>${profileEscape(p.name)}</h3><small>${p.simulated?L('NPC · simuliert','NPC · simulated','NPC · симуляция'):p.role==='gm'?'GM · DEV':L('Lokales Spielerprofil','Local player','Локальный игрок')}${v.arena?' · '+L('Arena-Aufstellung','Arena snapshot','Снимок арены'):''}</small><b class="gold">Lv ${fmt(r.level)} · ${fmt(cp)} CP</b></div></div>`;
 const body=q?`<div class="kwInspectXP"><div class="row"><small>XP</small><b>${fmt(q.xp)} / ${fmt(need)}</b></div><div class="bar" role="progressbar" aria-label="XP" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(ratio)}"><i style="width:${ratio}%"></i></div></div><div class="kwInspectMetrics">${[[L('Schaden','Damage','Урон'),fmt(stats.atk)],[L('Leben','Health','Здоровье'),fmt(stats.hp)],[L('Rüstung','Armor','Броня'),fmt(stats.def)],[L('Krit','Crit','Крит'),fmt(stats.crit*100)+'%'],[L('Ausweichen','Dodge','Уклонение'),fmt(stats.dodge*100)+'%'],['iLvl',String(stats.ilvl??0)]].map(([n,x])=>`<div><small>${n}</small><b>${x}</b></div>`).join('')}</div><div class="panel kwInspectStats">${attrs.map((n,i)=>`<div class="row"><small>${profileEscape(n)}</small><b>${fmt(stats.a[i])}</b></div>`).join('')}<div class="row"><small>${L('Arena-Siege / Niederlagen','Arena wins / losses','Арена победы / поражения')}</small><b>${fmt(r.arenaWins)} / ${fmt(r.arenaLosses)}</b></div></div><h3>${L('Ausrüstung','Equipment','Экипировка')}</h3><div class="kwInspectGearGrid">${kwRankGearMarkup(q)}</div>`:`<small>${L('Nur alter Ranglisten-Snapshot verfügbar. Vollständiges Profil noch nicht gespeichert.','Only an old rank snapshot is available. Full profile not saved yet.','Доступен только старый снимок рейтинга.')}</small>`;
 $('modal').hidden=false;$('modal').innerHTML=`<div class="sheet kwInspectSheet" role="dialog" aria-modal="true"><div class="row"><b>${L('Charakterprofil','Character profile','Профиль персонажа')}</b><button class="close" onclick="closeItem()">×</button></div>${head}${body}<button onclick="closeItem()">${L('Schließen','Close','Закрыть')}</button></div>`;
 return true;
}
