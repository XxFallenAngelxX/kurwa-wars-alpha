/* v0.56: GitHub-owner GM session; no credential is persisted or bundled. */
(() => {
  'use strict';
  const ownerId=50654704, repository='XxFallenAngelxX/kurwa-wars-alpha';
  const apiRoot='https://api.github.com', endpoint='/repos/'+repository+'/contents/world-layout.js';
  const params=new URLSearchParams(location.search);
  const requested=params.get('dev')==='1'||params.get('gm')==='1';
  const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
  window.KW_DEV_BUILD55=local&&requested;
  window.KW_GM_REMOTE55=false;
  window.KW_GM_BASE55='';
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
    if(!window.KW_GM_REMOTE55||!credential||!baseSha)throw Error('GM-Anmeldung erforderlich.');
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
  window.kwGMStart55=function(){
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
    const back=add('a','Zum normalen Spiel');back.href=location.pathname;back.style.color='#ffc75b';
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