// Refresh application files without deleting local player saves.
if(window.isSecureContext && 'serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{reg.update().catch(()=>{});document.addEventListener('visibilitychange',()=>{if(!document.hidden)reg.update().catch(()=>{})})}).catch(e=>console.warn('Offline cache:',e));}
