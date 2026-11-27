import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
const source=readFileSync(new URL('../src/engine/core/04-progression.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('const WEAPON_CLASSES='),source.indexOf('function reward('))+'\nthis.weaponClasses=WEAPON_CLASSES;';
const state={stats:[20,10,10,10,10],level:1,eq:[],rooms:Array(13).fill(0)};
const context={s:state,catalog:[['Klobürste',0]],Math,Number,roomBonus:()=>0,gearLevel:()=>0,combatValues:()=>({}),gmRoll:p=>p,hubLabel:(...labels)=>labels[0]};
runInNewContext(code,context);
const gear=(a,def=0)=>({a,slot:0,v:[0,0,0,0,0],atk:10,def,hp:0});
state.eq=[gear(0,7)];const melee=context.totals();
assert.equal(melee.weaponClass,'melee');assert.equal(melee.def,7);
state.eq=[gear(7,7)];const ranged=context.totals();assert.equal(ranged.weaponClass,'ranged');assert(melee.atk>ranged.atk);
state.stats[2]=30;assert(context.totals().atk>ranged.atk);
state.stats[1]=10000;const agile=context.totals();assert.equal(agile.def,7);assert(agile.dodge>ranged.dodge&&agile.dodge<.30);
assert(context.luckDropMultiplier([0,0,0,0,100],1)>context.luckDropMultiplier([0,0,0,0,0],1));
assert.equal(context.luckDropMultiplier([0,0,0,0,1e9],1),1.5);
assert(context.luckDropMultiplier([0,0,0,0,100],100)<context.luckDropMultiplier([0,0,0,0,100],1));
state.stats[4]=1e9;assert.equal(context.totals().crit,.50);
assert.equal(context.weaponClass(null),'melee');
assert.equal(context.weaponItemMarkup(null),'');assert.equal(context.weaponItemMarkup({slot:1,a:7}),'');
assert.match(context.weaponItemMarkup(gear(0)),/Nahkampf/);
assert.match(context.weaponItemMarkup(gear(7)),/Fernkampf/);
for(const [index,meleeLabel,rangedLabel] of [[1,'Melee','Ranged'],[2,'Ближний бой','Дальний бой']]){
 context.hubLabel=(...labels)=>labels[index];
 assert(context.weaponItemMarkup(gear(0)).includes(meleeLabel));
 assert(context.weaponItemMarkup(gear(7)).includes(rangedLabel));
}
for(let lang=0;lang<3;lang++){context.hubLabel=(...labels)=>labels[lang];for(let i=0;i<5;i++)assert(context.damageAttributeHint(i).length>20);for(const a of [0,7])assert(!context.weaponItemMarkup(gear(a)).includes(' · '));}
context.hubLabel=(...labels)=>labels[0];
state.stats=[20,10,10,10,10];state.eq=[gear(0)];const baseMelee=context.totals().atk;state.stats[2]+=10;assert.equal(context.totals().atk,baseMelee);state.stats[0]+=10;assert(context.totals().atk>baseMelee);
state.eq=[gear(7)];const baseRanged=context.totals().atk;state.stats[0]+=10;assert.equal(context.totals().atk,baseRanged);state.stats[2]+=10;assert(context.totals().atk>baseRanged);
const content=readFileSync(new URL('../src/engine/core/02-content-items.js',import.meta.url),'utf8');
const data={};const section=(start,end)=>{const a=content.indexOf(start),b=content.indexOf(end,a);assert(a>=0&&b>a,'Missing catalog section '+start);return content.slice(a,b)};
runInNewContext(section('const portrait=','function itemArt')+section('const UNIQUE_BASE=','const REGULAR_POOL=')+'\nthis.weapons=catalog.map((item,id)=>({item,id})).filter(x=>x.item[1]===0)',data);
const classes=context.weaponClasses,assigned=[...classes.melee,...classes.ranged];
assert.equal(new Set(assigned).size,assigned.length,'Duplicate weapon class assignment');
assert.deepEqual(Array.from(assigned).sort((a,b)=>a-b),Array.from(data.weapons,x=>x.id).sort((a,b)=>a-b),'Every catalog weapon must have an explicit class');
console.log('OK: weapon classes, damage attributes, item armor, dodge and luck bounds');

const trainSource=source.slice(source.indexOf('function trainCost('),source.indexOf('function upgrade(',source.indexOf('function trainCost(')));
const price=new Function('roomBonus',trainSource+';return trainCost')(()=>0);
const low={stats:[15],training:[5],level:1,rooms:Array(13).fill(0)};
const high={stats:[114],training:[5],level:100,rooms:Array(13).fill(0)};
assert.equal(price(0,low),price(0,high),'Level gains must not increase training prices');
high.stats[0]++;high.training[0]++;
assert(price(0,high)>price(0,low),'Purchased training must increase the price');
const legacy={stats:[114],level:100,rooms:Array(13).fill(0)};
assert.equal(price(0,legacy),price(0,low),'Legacy saves infer purchased points');
console.log('OK: training price grows with purchased points, including legacy saves');

const affixData={};runInNewContext(section('const affixDefs=','const ITEM_TITLE_VARIANTS=')+';this.data={affixDefs,KW_WEAPON_AFFIXES,kwWeaponAffixAllowed,combatValues,affixBestTier,affixTierGate,rollAffixTier,affixValue,applyAffix,affixSecondaryValue,KW_EXTRA_AFFIXES,kwAffixEffectGate,KW_EFFECT_GATES}',affixData);
const aff=affixData.data;
assert.equal(aff.affixDefs.length,50);assert.equal(aff.KW_EXTRA_AFFIXES.length,22);assert.equal(aff.KW_WEAPON_AFFIXES.length,7);
for(let i=21;i<28;i++){assert(aff.kwWeaponAffixAllowed(aff.affixDefs[i],0,new Set(),100));assert(!aff.kwWeaponAffixAllowed(aff.affixDefs[i],1,new Set(),100));assert(!aff.kwWeaponAffixAllowed(aff.affixDefs[i],0,new Set([21]),100));}
assert.equal(aff.combatValues([{pctPoison:.1}]).weaponAura,'poison');assert.equal(aff.combatValues([]).weaponAura,'');assert.equal(aff.combatValues([{pctPoison:.9}]).pctPoison,.25);
console.log('OK: seven append-only weapon affixes, weapon-only eligibility, aura and proc caps');

for(let l=1;l<=150;l++){
 const expected=Math.max(1,11-Math.max(1,Math.floor(l/10)));
 assert.equal(aff.affixBestTier(l),expected);
 assert.equal(aff.rollAffixTier(l,()=>0),expected);
 assert.equal(aff.rollAffixTier(l,()=>.999999),10);
 for(let r=0;r<100;r++){const tier=aff.rollAffixTier(l,()=>r/100);assert(tier>=expected&&tier<=10);assert(aff.affixTierGate(tier)<=l);}
}
for(const d of aff.affixDefs)for(let tier=1;tier<=10;tier++){
 const lo=aff.affixValue(d,100,4,tier,.85),hi=aff.affixValue(d,100,4,tier,1.15);
 assert(Number.isFinite(lo)&&lo>0&&hi>=lo);
 if(tier<10)assert(aff.affixValue(d,100,4,tier,1)>=aff.affixValue(d,100,4,tier+1,1));
 const out={v:[0,0,0,0,0]};aff.applyAffix(out,d,lo);assert(Object.values(out).flat().every(Number.isFinite));
 if(d[5])assert.equal(out[d[5][0]],aff.affixSecondaryValue(d,lo));
}
assert.equal(aff.affixValue(aff.affixDefs[0],100,4,1,1,1),Math.max(1,Math.round(102*(1+4*.27)*.51*1.2)));
for(const locale of [0,1,2])assert.equal(new Set(aff.KW_EXTRA_AFFIXES.map(row=>row[0][locale])).size,22);
const reqSource=content.slice(content.indexOf('function relicGate('),content.indexOf('function gearLevel('));
const req=new Function('affixTierGate','UNIQUES',reqSource+'return itemReq')(aff.affixTierGate,[]);
assert.equal(req({l:100,mods:[{tier:1,tierScale:2}]}),100);
assert.equal(req({l:100,mods:[{tier:1}]}),85);
console.log('OK: 50 affixes, T10–T1 level gates, hybrid values and legacy roll compatibility');

for(const [key,gate] of Object.entries(aff.KW_EFFECT_GATES)){const d=aff.affixDefs.find(d=>d[2]===key);assert(d);assert.equal(aff.kwAffixEffectGate(d),gate);assert(!aff.kwWeaponAffixAllowed(d,0,new Set(),gate-1));assert(aff.kwWeaponAffixAllowed(d,0,new Set(),gate));}
for(const d of aff.affixDefs){const gate=aff.kwAffixEffectGate(d);assert(!aff.kwWeaponAffixAllowed(d,0,new Set(),gate-1));assert(aff.kwWeaponAffixAllowed(d,0,new Set(),gate));}
assert.equal(req({l:60,mods:[{tier:10,tierScale:2,effectGate:60}]}),60);
assert.equal(req({l:60,mods:[{tier:10,tierScale:2}]}),51);
console.log('OK: ten effect level gates, hybrid gates and legacy compatibility');
