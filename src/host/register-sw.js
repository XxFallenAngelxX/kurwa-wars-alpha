// Apply a new service worker without interrupting a fight, modal, or text entry.
if(window.isSecureContext && 'serviceWorker' in navigator){
 let controlled=!!navigator.serviceWorker.controller,pending=false,reloading=false;
 function applyUpdate(){
  if(!pending||reloading||document.hidden)return;
  const active=document.activeElement;
  if(active?.matches('input,textarea,select,[contenteditable="true"]'))return;
  try{
   const w=kwFrame.contentWindow;
   if(typeof w.__canReloadForUpdate!=='function'||!w.__canReloadForUpdate())return;
   const editor=document.getElementById('kwUI55')?.querySelector('.kw55Editor:not([hidden])');
   if(editor)return;
   w.__save48?.();
   reloading=true;location.reload();
  }catch(e){console.warn('Update postponed:',e)}
 }
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(!controlled){controlled=true;return}
  pending=true;applyUpdate();
 });
 navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{
  const check=()=>{if(!document.hidden&&navigator.onLine)reg.update().catch(()=>{});applyUpdate()};
  check();document.addEventListener('visibilitychange',check);window.addEventListener('online',check);
  setInterval(check,5*60*1000);setInterval(applyUpdate,2000);
 }).catch(e=>console.warn('Offline cache:',e));
}
