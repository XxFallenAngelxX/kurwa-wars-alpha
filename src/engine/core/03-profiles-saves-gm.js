// Local dev profiles. NOT authentication; public build cannot select GM profiles.
const KW_DEV_BUILD=parent.KW_DEV_BUILD55===true;
const PROFILE_STORE='kwars_profiles_v1', PROFILE_ACTIVE=parent.KW_GM_REMOTE55?'kwars_profile_active_gm_v1':'kwars_profile_active_v1';
const PROFILE_AVATARS=["@@LOCAL:54051924223efdcca483.webp@@", "@@LOCAL:c50a791d0fb6c11ad2b5.webp@@", "@@LOCAL:fdd1a0fc63fe476dbd42.webp@@", "@@LOCAL:c095f5afa56b44080e80.webp@@", "@@LOCAL:f4c9565976401fd3ce16.webp@@", "@@LOCAL:3dc76cf77ae112e8099b.webp@@", "@@LOCAL:7a8a40e6c2822f2fef47.webp@@", "@@LOCAL:a180983489731204fa6a.webp@@", "@@LOCAL:87f799069357c7f5e0b5.webp@@", "@@LOCAL:7bc681944d9880486bd0.webp@@"];
function profileRead(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}}
function profileWrite(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}}
const guestProfile={id:'guest',name:'Gast',avatar:0,role:'player'};
const storedProfile52=profileRead(PROFILE_ACTIVE), legacyGuest52=!!(profileRead('kwars5')||profileRead('kwars4')||profileRead('kwars3'));let profiles=profileRead(PROFILE_STORE);if(!Array.isArray(profiles))profiles=[];
profiles=profiles.filter(p=>p&&/^[a-z0-9_-]+$/.test(p.id)&&typeof p.name==='string'&&['gm','player'].includes(p.role));
if(!profiles.some(p=>p.id==='guest'))profiles.unshift(guestProfile);
let activeProfile=profiles.find(p=>p.id===profileRead(PROFILE_ACTIVE)&&(p.role==='player'||KW_DEV_BUILD))||profiles.find(p=>p.id==='guest')||guestProfile;
function profileKey(p){return p.id==='guest'?'kwars5':'kwars5:'+p.id}
const serverBoot=window.KW_SERVER_BOOT||null;let onboard52=!serverBoot&&!profiles.some(p=>p.id===storedProfile52&&(p.role==='player'||KW_DEV_BUILD));
if(serverBoot){activeProfile=serverBoot.profile;profiles=[activeProfile];}
if(!serverBoot&&parent.KW_GM_REMOTE55&&storedProfile52==='gm_dev'){activeProfile=localGMProfile()||activeProfile;onboard52=false;}
key=profileKey(activeProfile);
function profileName(){return activeProfile.name}
function profileEscape(x){return String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function profileNameHtml(){return profileEscape(profileName())}
function profileArt(p=activeProfile){return p.role==='gm'&&KW_DEV_BUILD&&p.avatar===-1?portrait:PROFILE_AVATARS[p.avatar]||PROFILE_AVATARS[0]}
function profileNormalize(x){return String(x).normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE')}
function profileReserved(x){return ['el gato blanko','el gato blanco','el blanko','el blanco','admin','gm','gamemaster','gast'].includes(profileNormalize(x))}
function profileCreate(name,avatar){if(serverBoot)return null;name=String(name).normalize('NFKC').trim().replace(/\s+/g,' ');if(!/^[\p{L}\p{N} _-]{3,20}$/u.test(name)||profileReserved(name)||profiles.some(p=>profileNormalize(p.name)===profileNormalize(name))||!Number.isInteger(avatar)||avatar<0||avatar>=PROFILE_AVATARS.length)return null;let p={id:uid(),name,avatar,role:'player'};let next=[...profiles,p];if(!profileWrite(PROFILE_STORE,next))return null;profiles=next;return p}
function localGMProfile(){if(serverBoot)return null;if(!KW_DEV_BUILD)return null;let p=profiles.find(p=>p.id==='gm_dev');if(p)return p;p={id:'gm_dev',name:'El Gato Blanko',avatar:-1,role:'gm'};let next=[...profiles,p];if(!profileWrite(PROFILE_STORE,next))return null;profiles=next;return p}
function profileSelect(id){if(serverBoot)return false;if(battle?.running)return false;let p=profiles.find(p=>p.id===id);if(!p||(p.role==='gm'&&!KW_DEV_BUILD))return false;if(!save()||!profileWrite(PROFILE_STORE,profiles)||!profileWrite(PROFILE_ACTIVE,p.id))return false;reloadProfile();return true}
function reloadProfile(){parent.kwSwitchProfile()}
function gmAllowed(){return KW_DEV_BUILD&&activeProfile.role==='gm'}
function gmState(){if(!gmAllowed())return null;return s.gm??={enabled:false,xp:10,cash:5,drop:3,travel:.1}}
// Duration multipliers: 0 = instant, 1 = ordinary duration. No effect on player profiles.
const GM_TIME_KEYS=['travel','garage','hq','fleet','salvage','fusion','shift','arena','energy','shop','production','combat','memory'];
function gmTimeFactor(k){let g=gmState();if(!g?.enabled||!GM_TIME_KEYS.includes(k))return 1;let n=Number(g[k]??1);return Number.isFinite(n)?clamp(n,0,1):1}
function gmTime(k,ms){return Math.round(ms*gmTimeFactor(k))}
function gmShopInterval(){return gmTimeFactor('shop')===0?Infinity:gmTime('shop',21600000)}
function gmBattleInterval(ms){return Math.max(1,gmTime('combat',ms))}
function gmFactor(k){if(k==='travel')return gmTimeFactor(k);let g=gmState();if(!g?.enabled)return 1;let n=Number(g[k]);return Number.isFinite(n)?clamp(n,k==='travel'?.01:1,k==='travel'?1:100):1}
function gmRoll(p){return Math.random()<Math.min(1,Math.max(0,p*gmFactor('drop')))}

function fresh(){let a=make(0,1,0),b=make(3,1,0);return {tutorial55:0,level:1,xp:0,gold:500,energy:100,stats:[10,10,10,10,10],bag:[],eq:[a,null,b,null,null,null],wins:0,gang:0,d:Array(zones.length).fill(0),keys:Array(zones.length).fill(false),keyPity:0,tower:0,premium:12,shop:[],shopAt:0,last:Date.now(),restAt:0,rooms:Array(13).fill(0)}}
function migrate(o){if(!o||!Array.isArray(o.bag)||!Array.isArray(o.eq)||!Array.isArray(o.stats))return fresh();let all=o.bag.map(i=>({...i,...rollStats(i.slot,i.l,i.r,i.p)}));return {...o,bag:all.filter(i=>!o.eq.includes(i.id)),eq:[...o.eq.map(id=>all.find(i=>i.id===id)||null),null,null].slice(0,6),restAt:0}}
let s,loaded='';try{let a=localStorage.getItem(key),b=key==='kwars5'?localStorage.getItem('kwars4'):null,c=key==='kwars5'?localStorage.getItem('kwars3'):null;s=a?JSON.parse(a):b?JSON.parse(b):c?migrate(JSON.parse(c)):fresh();if(!a&&(b||c)){let d=s.d||[];s.d=[d[0]||0,d[1]||0,0,d[2]||0,0];s.keys=s.d.map(x=>x>0);loaded='Alter Spielstand übernommen.'}}catch(e){s=fresh()}if(serverBoot)s=serverBoot.state||fresh();if(!s||!Array.isArray(s.eq)||s.eq.length!==6)s=fresh();s.d=Array.from({length:zones.length},(_,i)=>Math.min(zones[i][2].length,s.d?.[i]||0));s.keys=Array.from({length:zones.length},(_,i)=>!!s.keys?.[i]||s.d[i]>0);s.keyPity??=0;s.tower??=0;s.premium??=12;s.shop??=[];s.shopAt??=0;s.last??=Date.now();s.rooms=Array.from({length:13},(_,i)=>Math.max(0,Math.floor(Number(s.rooms?.[i])||0)));msg=loaded;
