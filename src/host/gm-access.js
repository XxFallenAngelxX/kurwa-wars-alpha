/* v0.56.2: isolated token-free GM editing; GitHub login handles publication. */
(() => {
  'use strict';
  const ownerId=50654704, repository='XxFallenAngelxX/kurwa-wars-alpha';
  const apiRoot='https://api.github.com', endpoint='/repos/'+repository+'/contents/world-layout.js';
  const params=new URLSearchParams(location.search);
  const test=['1','test'].includes(params.get('gm')) || (/\/gm\.html$/i.test(location.pathname)&&params.get('gm')!=='publish');
  const requested=params.get('dev')==='1'||params.get('gm')==='publish';
  const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
  window.KW_DEV_BUILD55=test||(local&&requested);
  // Existing engine uses this flag for the separate GM profile and editor UI.
  // It is not an authorization flag: writes additionally require a verified credential.
  window.KW_GM_REMOTE55=test;
  window.KW_GM_BASE55=test?'local-draft':'';
  const draftKey='kwars_world_layout_v55:gm:local-draft';
  const profileKey='kwars_profile_active_gm_v1';
  let prepared=false;
  if(test){try{localStorage.setItem(profileKey,'"gm_dev"');const previous=localStorage.getItem('kwars_world_layout_v55');if(previous&&!localStorage.getItem(draftKey))localStorage.setItem(draftKey,previous);prepared=true}catch{}}
  let credential='', baseSha='', publishing=false;
  const ids=Object.keys(window.KW_WORLD_LAYOUT55||{});
  function validate(layout){
    if(!layout||typeof layout!=='object'||Array.isArray(layout)||ids.length!==18)throw Error('Layout-Datei ungültig.');
    const out={};
    for(const id of ids){
      const v=layout[id];if(!v||typeof v!=='object')throw Error('Layout unvollständig: '+id);
      const o={};
      for(const [k,min,max] of [['x',1,99],['y',1,99],['scale',.4,2.5],['z',1,20]]){
        const n=v[k];if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max||(k==='z'&&!Number.isInteger(n)))throw Error('Ungültiger Wert: '+id+' / '+k);
        o[k]=n;
      }
      out[id]=o;
    }
    return out;
  }
  async function github(path,token,options={}){
    const response=await fetch(apiRoot+path,{method:options.method||'GET',headers:{'Accept':'application/vnd.github+json','Authorization':'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28',...(options.body?{'Content-Type':'application/json'}:{})},credentials:'omit',cache:'no-store',...(options.body?{body:JSON.stringify(options.body)}:{})});
    if(!response.ok){
      if(response.status===401||response.status===403)throw Error('GitHub-Zugriff verweigert. Token und Repository-Berechtigung prüfen.');
      if(response.status===409||response.status===422)throw Error('GitHub-Konflikt. Layout wurde nicht überschrieben. GM-Link neu öffnen und erneut prüfen.');
      throw Error('GitHub meldet HTTP '+response.status+'.');
    }
    return response.json();
  }
  function decodeFile(file){
    if(file.encoding!=='base64'||typeof file.content!=='string'||typeof file.sha!=='string')throw Error('Layout-Datei fehlt.');
    const bytes=Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0));
    const source=new TextDecoder().decode(bytes);
    const match=source.match(/^\s*window\.KW_WORLD_LAYOUT55\s*=\s*(\{[\s\S]*\})\s*;\s*$/);
    if(!match)throw Error('Layout-Dateiformat ungültig.');
    return validate(JSON.parse(match[1]));
  }
  window.kwGMPublish55=async function(layout){
    if(test||!window.KW_GM_REMOTE55||!credential||!baseSha)throw Error('Für Live-Schreibzugriff ist eine GitHub-Anmeldung erforderlich.');
    if(publishing)throw Error('Eine Veröffentlichung läuft bereits.');
    publishing=true;
    try{
      const clean=validate(layout);
      const current=await github(endpoint+'?ref=main',credential);
      if(current.sha!==baseSha)throw Error('Das Live-Layout wurde zwischenzeitlich geändert. Bitte GM-Link neu öffnen.');
      const source='window.KW_WORLD_LAYOUT55 = '+JSON.stringify(clean,null,2)+';\n';
      const content=btoa(String.fromCharCode(...new TextEncoder().encode(source)));
      const result=await github(endpoint,credential,{method:'PUT',body:{message:'GM: publish world placement to live game',content,sha:baseSha,branch:'main'}});
      if(!result.content?.sha||!result.commit?.sha)throw Error('Keine Commit-Bestätigung von GitHub.');
      baseSha=result.content.sha;window.KW_GM_BASE55=baseSha;window.KW_WORLD_LAYOUT55=clean;
      try{window.kwLocalStore.setItem('kwars_world_layout_v55:gm:'+baseSha,JSON.stringify(clean))}catch{}
      return result.commit.sha;
    }finally{publishing=false}
  };
  let testStarted=false;
  window.kwGMStart55=function(){
    if(test){
      if(testStarted)return;
      testStarted=true;
      window.kwLocalStore.setItem(profileKey,'"gm_dev"');
      window.KW_DEV_BUILD55=true;
      function layoutSource(){
        if(!kwEditorData55?.layout)throw Error('Placement-Editor zuerst öffnen.');
        const clean=validate(kwEditorData55.layout);
        window.kwLocalStore.setItem(draftKey,JSON.stringify(clean));
        return 'window.KW_WORLD_LAYOUT55 = '+JSON.stringify(clean,null,2)+';\n';
      }
      function saveFile(){
        try{
          const source=layoutSource();
          const url=URL.createObjectURL(new Blob([source],{type:'text/javascript;charset=utf-8'}));
          const a=document.createElement('a');a.href=url;a.download='world-layout.js';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
        }catch(e){alert(e.message)}
      }
      function publishDraft(){
        try{
          const source=layoutSource();
          const panel=document.createElement('section');
          panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Layout veröffentlichen');
          panel.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#15111af5;color:#ffe8c0;padding:16px;display:grid;place-items:center;overflow:auto';
          const box=document.createElement('div');box.style.cssText='width:min(100%,560px);display:grid;gap:12px';
          const title=document.createElement('h2');title.textContent='Layout für alle Spieler übernehmen';
          const help=document.createElement('p');help.textContent='Koordinaten kopieren, GitHub-Datei öffnen, vorhandenen Inhalt ersetzen und Commit changes wählen. Kein neuer Token nötig.';
          const area=document.createElement('textarea');area.value=source;area.readOnly=true;area.rows=10;area.style.cssText='width:100%;box-sizing:border-box;font:13px monospace';
          const copy=document.createElement('button');copy.textContent='Koordinaten kopieren';copy.type='button';
          copy.onclick=async()=>{try{await navigator.clipboard.writeText(source);copy.textContent='Kopiert'}catch{area.focus();area.select();try{if(document.execCommand('copy'))copy.textContent='Kopiert';else copy.textContent='Markiert – bitte kopieren'}catch{copy.textContent='Markiert – bitte kopieren'}}};
          const link=document.createElement('a');link.href='https://github.com/'+repository+'/edit/main/world-layout.js';link.target='_blank';link.rel='noopener noreferrer';link.textContent='GitHub-Datei öffnen';link.style.color='#ffc75b';
          const close=document.createElement('button');close.type='button';close.textContent='Schließen';close.onclick=()=>panel.remove();
          box.append(title,help,area,copy,link,close);panel.append(box);document.body.append(panel);
        }catch(e){alert(e.message)}
      }
      // Reuse the existing editor and drag logic, changing only its save controls.
      const draw=window.kwEditorDraw55;
      if(typeof draw==='function'){
        window.kwEditorDraw55=function(m){
          draw(m);
          if(!m)return;
          const header=document.querySelector('.kw55Editor .kw55EditorRow');
          if(!header||header.querySelector('[data-kw-draft-save]'))return;
          const old=[...header.querySelectorAll('button')].find(b=>b.textContent==='Live veröffentlichen');
          const save=document.createElement('button');save.type='button';save.dataset.kwDraftSave='1';save.textContent='Layout speichern';save.onclick=saveFile;
          const publish=document.createElement('button');publish.type='button';publish.textContent='Für alle veröffentlichen';publish.onclick=publishDraft;
          if(old)old.replaceWith(save,publish);else header.append(save,publish);
        };
      }
      // The original live-publish handler remains guarded; draft publishing never calls it.
      if(!prepared)window.kwSwitchProfile();
      return;
    }
    if(!requested||local||window.KW_GM_REMOTE55)return;
    const overlay=document.createElement('div');
    overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','GM-Anmeldung');
    overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:#15111af5;color:#ffe8c0;font:15px system-ui,sans-serif;padding:12px;box-sizing:border-box;overflow:auto';
    const form=document.createElement('form');form.style.cssText='width:min(420px,100%);max-height:100%;overflow:auto;display:grid;gap:12px;padding:18px;box-sizing:border-box;background:#28212e;border:1px solid #b88b50;border-radius:12px';
    function add(tag,text){const e=document.createElement(tag);e.textContent=text;form.append(e);return e}
    add('h2','GM · Anmeldung');
    add('p','Nur der GitHub-Repository-Inhaber darf den GM-Modus regulär öffnen und das Live-Layout veröffentlichen.');
    add('small','Einmalig einen Fine-grained GitHub Token für kurwa-wars-alpha erstellen: Contents – Read and write. Der Token bleibt nur im Arbeitsspeicher dieses Tabs und wird ausschließlich an die GitHub-API gesendet.');
    const link=add('a','GitHub-Token erstellen');link.href='https://github.com/settings/personal-access-tokens/new';link.target='_blank';link.rel='noopener noreferrer';link.style.color='#ffc75b';
    const input=add('input','');input.type='password';input.placeholder='GitHub-Token';input.autocomplete='off';input.required=true;input.setAttribute('aria-label','GitHub-Token');input.style.cssText='padding:12px;font-size:16px;border:1px solid #a77c4c;border-radius:6px;background:#15111a;color:#fff';
    const submit=add('button','GM öffnen');submit.type='submit';submit.style.cssText='padding:12px;background:#c18a42;color:#201923;border:0;border-radius:6px;font-weight:700;font-size:16px';
    const back=add('a','Zum normalen Spiel');back.href='./index.html';back.style.color='#ffc75b';
    const message=add('p','');message.setAttribute('role','status');message.style.color='#ffc75b';
    overlay.append(form);document.body.append(overlay);
    form.addEventListener('submit',async e=>{
      e.preventDefault();if(submit.disabled)return;const token=input.value.trim();if(!token)return;
      submit.disabled=true;input.disabled=true;message.textContent='GitHub-Berechtigung wird geprüft …';
      try{
        const who=await github('/user',token);
        if(who.id!==ownerId)throw Error('Dieses GitHub-Konto ist nicht als GM zugelassen.');
        const repo=await github('/repos/'+repository,token);
        if(repo.permissions?.push!==true)throw Error('Keine Schreibberechtigung für dieses Repository.');
        const file=await github(endpoint+'?ref=main',token);
        const layout=decodeFile(file);
        window.kwLocalStore.setItem('kwars_profile_active_gm_v1','"gm_dev"');
        credential=token;baseSha=file.sha;window.KW_GM_BASE55=baseSha;window.KW_WORLD_LAYOUT55=layout;
        window.KW_GM_REMOTE55=true;window.KW_DEV_BUILD55=true;
        input.value='';overlay.remove();window.kwSwitchProfile();
      }catch(error){message.textContent=error.message||'GM-Anmeldung fehlgeschlagen.';input.value='';submit.disabled=false;input.disabled=false;input.focus()}
    });
  };
})();