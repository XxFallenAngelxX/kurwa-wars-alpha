import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

async function scenario(initialController){
 const listeners={},intervals=[],calls={reload:0,save:0,update:0},state={safe:true,editor:false};
 const reg={update:async()=>{calls.update++}};
 const sw={controller:initialController,addEventListener:(n,fn)=>listeners[n]=fn,register:async()=>reg};
 const context={navigator:{serviceWorker:sw,onLine:true},document:{hidden:false,activeElement:null,getElementById:()=>state.editor?{querySelector:()=>({})}:null,addEventListener(){}},
  kwFrame:{contentWindow:{__canReloadForUpdate:()=>state.safe,__save48:()=>calls.save++}},location:{reload:()=>calls.reload++},
  window:{isSecureContext:true,addEventListener(){}},setInterval:fn=>intervals.push(fn),console};
 runInNewContext(readFileSync(new URL('../src/host/register-sw.js',import.meta.url),'utf8'),context);
 await Promise.resolve();await Promise.resolve();
 return {listeners,intervals,calls,state};
}
const first=await scenario(null);first.listeners.controllerchange();assert.equal(first.calls.reload,0,'first install must not reload');
const active=await scenario({});active.state.safe=false;active.listeners.controllerchange();assert.equal(active.calls.reload,0,'fight or modal must not be interrupted');
active.state.safe=true;active.state.editor=true;for(const tick of active.intervals)tick();assert.equal(active.calls.reload,0,'editor must not be interrupted');
active.state.editor=false;for(const tick of active.intervals)tick();assert.equal(active.calls.save,1);assert.equal(active.calls.reload,1);
for(const tick of active.intervals)tick();assert.equal(active.calls.reload,1,'must not reload repeatedly');
console.log('OK: first install, deferred update, save and single reload');
