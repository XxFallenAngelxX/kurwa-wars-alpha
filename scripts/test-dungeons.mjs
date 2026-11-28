import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('src/engine/core/02-content-items.js'),enemy=read('src/engine/core/05-materials-enemies.js'),combat=read('src/engine/core/06-combat-world-ui.js');
const world=new Function(source.slice(source.indexOf('const zones='),source.indexOf('const npcArt='))+'return {zones,DUNGEON_ORIGINAL_BOSSES,DUNGEON_EXTENSION_ROSTERS,DUNGEON_ORIGINAL_LEVELS,storyBossLevel,dungeonUnlocked,dungeonKeyEligible}')();
const foes=new Function(enemy.slice(enemy.indexOf('const enemyImages='))+'return foeTypes.map((f,i)=>[f[0],enemyArt(i)])')();
const {zones,DUNGEON_ORIGINAL_BOSSES:old,DUNGEON_EXTENSION_ROSTERS:extra,DUNGEON_ORIGINAL_LEVELS:levels,storyBossLevel:level,dungeonUnlocked:unlocked,dungeonKeyEligible:eligible}=world;
assert.equal(zones.length,14);
for(let i=0;i<zones.length;i++){const z=zones[i];assert.ok(z[2].length>=15&&z[2].length<=25);assert.deepEqual(z[2].slice(0,old[i].length),old[i]);assert.equal(new Set(z[2].map(b=>b[1])).size,z[2].length);
 const art=new Set();for(const [type,name] of extra[i]){assert.equal(foes[type][0],name);assert.ok(foes[type][1]?.startsWith('@@LOCAL:'));assert.ok(!art.has(foes[type][1]));art.add(foes[type][1])}
 for(let k=0;k<z[2].length;k++){assert.ok(Number.isInteger(level(i,k)));if(k<levels[i].length)assert.equal(level(i,k),levels[i][k]);if(k>0)assert.ok(level(i,k)>=level(i,k-1))}
 if(i+1<zones.length)assert.ok(level(i,z[2].length-1)>=zones[i+1][1]);
}
const s={level:50,d:old.map(x=>x.length),keys:old.map((_,i)=>i<=4)};
assert.ok(unlocked(s,4));assert.equal(eligible(s,5),false);s.d[4]=zones[4][2].length;assert.ok(eligible(s,5));s.keys[5]=true;s.d[4]=old[4].length;assert.ok(unlocked(s,5));
assert.match(combat,/DUNGEON_ORIGINAL_BOSSES\.slice\(ENDGAME_START\)/);
assert.match(combat,/b\.activityReward\?/);
console.log('OK expanded dungeon content:',zones.map(z=>z[2].length).join(', '));

// Fog of war is checked across every progression state, including the final fight.
const ui=read('src/engine/core/12-milestones-profiles.js');
const fog=new Function('zones','storyBossLevel','bossPortrait','logEscape',ui.slice(ui.indexOf('const DUNGEON_UNKNOWN_ART='),ui.indexOf('function render(){'))+'return {DUNGEON_UNKNOWN_ART,dungeonVisibleMaxLevel,dungeonBossStepState,dungeonBossStepArt,dungeonBossStepTitle,dungeonBossSteps}')(zones,level,b=>'portrait:'+b[1],x=>String(x).replaceAll('"','&quot;'));
for(let i=0;i<zones.length;i++){let z=zones[i];for(let k=0;k<=z[2].length;k++){let state={d:[]};state.d[i]=k;assert.equal(fog.dungeonVisibleMaxLevel(i,state),k===z[2].length?level(i,k-1):'???');for(let j=0;j<z[2].length;j++){let expected=j<k?'done':j===k?'current':j===k+1?'next':'unknown';assert.equal(fog.dungeonBossStepState(i,j,state),expected);assert.equal(fog.dungeonBossStepArt(i,j,state),expected==='unknown'?fog.DUNGEON_UNKNOWN_ART:'portrait:'+z[2][j][1]);assert.equal(fog.dungeonBossStepTitle(i,j,state),expected==='unknown'?'???':z[2][j][1]);}let markup=fog.dungeonBossSteps(i,state);assert.equal((markup.match(/class="dungeonStep /g)||[]).length,z[2].length)}}
assert.match(ui,/dungeonVisibleMaxLevel\(i\)/);assert.match(ui,/dungeonBossSteps\(dp\)/);
console.log('OK dungeon fog of war: all progression states');
