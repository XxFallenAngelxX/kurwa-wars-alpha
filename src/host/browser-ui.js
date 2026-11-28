function kwComparableMarkup(old,next){if(!old.querySelector('.world45Strip'))return old.outerHTML;const copy=old.cloneNode(true);copy.querySelectorAll('.kwAmbient').forEach(e=>e.remove());const viewport=copy.querySelector('.worldViewport');if(viewport&&!next.querySelector('.worldViewport')?.hasAttribute('tabindex'))viewport.removeAttribute('tabindex');return copy.outerHTML;}

'use strict';
// Retain the connected world map when only the surrounding UI or action tokens change.
const kwWorldActionAttrs=['data-control','data-confirm','data-audio','data-portal'];
function kwWorldStableMarkup(view){
 const copy=view.cloneNode(true);
 copy.querySelectorAll('.kwAmbient').forEach(e=>e.remove());
 copy.removeAttribute('tabindex');
 copy.classList.remove('kwDragging');
 for(const el of copy.querySelectorAll('button'))for(const attr of kwWorldActionAttrs)el.removeAttribute(attr);
 return copy.outerHTML;
}
function kwPatchWorldScreen(old,next){
 if(old.id!=='screen'||next.id!=='screen')return false;
 const before=[...old.children],after=[...next.children];
 const i=before.findIndex(e=>e.matches('.worldViewport'));
 if(i<0||before.length!==after.length||!after[i].matches('.worldViewport'))return false;
 const view=before[i],incoming=after[i];
 if(!view.querySelector('.world45Strip')||!incoming.querySelector('.world45Strip')||
    kwWorldStableMarkup(view)!==kwWorldStableMarkup(incoming))return false;
 // The engine may issue fresh control tokens after an action or modal transition.
 const buttons=[...view.querySelectorAll('button')],newButtons=[...incoming.querySelectorAll('button')];
 if(buttons.length!==newButtons.length)return false;
 for(let n=0;n<buttons.length;n++)for(const attr of kwWorldActionAttrs){
  const value=newButtons[n].getAttribute(attr);
  if(value===null)buttons[n].removeAttribute(attr);
  else if(buttons[n].getAttribute(attr)!==value)buttons[n].setAttribute(attr,value);
 }
 for(const attr of [...old.attributes])if(!next.hasAttribute(attr.name))old.removeAttribute(attr.name);
 for(const attr of [...next.attributes])if(old.getAttribute(attr.name)!==attr.value)old.setAttribute(attr.name,attr.value);
 for(let n=0;n<before.length;n++)if(n!==i&&before[n].outerHTML!==after[n].outerHTML)before[n].replaceWith(after[n]);
 return true;
}

const mount=document.getElementById('mount'), status=document.getElementById('connection');let csrf='',etag='',busy=false,editing=false,queued=null,kwWorldScroll=0;
function err(t){status.hidden=!t;status.textContent=t||''}
async function api(path,data){return localApi(path,data)}
const kwVictoryQueue=[];
let kwVictoryActive=false,kwVictoryLastLine=-1,kwVictoryInterrupt=null;
const kwVictoryArt={closed:'./assets/codex/book-closed.webp',open:'./assets/codex/book-open.webp',page:'./assets/codex/page.webp',soul:'./assets/codex/soul.webp'};
for(const src of Object.values(kwVictoryArt)){const img=new Image();img.src=src}
// Fly the closed codex in viewport coordinates, not in the scaled combat scene.

// Animated local fel-fire aura. The original book sprites are never modified.
// Silhouette-driven rising fire. Sample the real alpha channel of both book sprites.
// Each tongue is advected upward; no rectangular SDF, border, or glow frame.
const KW_CODEX_FIRE_VERTEX='attribute vec2 aPosition;void main(){gl_Position=vec4(aPosition,0.,1.);}';
const KW_CODEX_FIRE_FRAGMENT=[
'precision mediump float;',
'uniform sampler2D uMask; uniform vec2 uResolution; uniform float uTime; uniform vec4 uBook;',
'float hash(vec2 p){return fract(sin(dot(p,vec2(41.73,29.17)))*4375.13);}',
'float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}',
'float fbm(vec2 p){return .57*noise2(p)+.29*noise2(p*2.03+5.2)+.14*noise2(p*4.1+9.7);}',
'float sampleBook(vec2 p,vec2 center,vec2 scale,float slot){vec2 q=(p-center)/scale+center;vec2 uv=q/vec2(340.,300.);if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.)return 0.;return smoothstep(.15,.65,texture2D(uMask,vec2((uv.x+slot)*.5,uv.y)).a);}',
'float maskAt(vec2 p){float a=0.;if(uBook.x>.001)a=sampleBook(p,vec2(170.,152.),vec2(uBook.z),0.)*uBook.x;if(uBook.y>.001)a=max(a,sampleBook(p,vec2(170.,164.),vec2(uBook.w,1.),1.)*uBook.y);return a;}',
'void main(){',
' vec2 uv=gl_FragCoord.xy/uResolution; vec2 p=vec2(uv.x,1.-uv.y)*vec2(340.,300.);',
' float t=uTime;float n=fbm(vec2(p.x*.091,p.y*.034+t*3.1));float curl=fbm(vec2(p.x*.045+t*.7,p.y*.052+t*2.1));',
' float wave=.5+.5*sin(p.x*.16+curl*6.5+t*2.8);float reach=16.+60.*pow(wave,.95)*(.45+.55*n);',
' float heat=0.;',
' for(int j=1;j<=6;j++){float s=float(j)/6.;float rise=s*reach;float drift=(curl-.5)*rise*.65+sin(p.y*.07+t*4.+p.x*.04)*s*8.;',
'  float m=maskAt(p+vec2(drift,rise));heat=max(heat,m*(1.-s*.78));}',
' float side=max(maskAt(p+vec2(11.+n*9.,6.)),maskAt(p-vec2(11.+n*9.,-6.)));',
' float under=maskAt(p-vec2(0.,7.));heat=max(heat,side*(.24+.33*n));heat=max(heat,under*.25);',
' float outside=1.-maskAt(p);float filament=clamp((n-.28)*2.2+heat*.46,0.,1.);',
' float alpha=outside*smoothstep(.07,.42,heat)*filament; ',
' float h=clamp(heat*(.7+.3*n),0.,1.);',
' vec3 col=mix(vec3(.51,.035,.52),vec3(1.,.075,.014),smoothstep(.11,.39,h));',
' col=mix(col,vec3(1.,.46,.018),smoothstep(.29,.65,h));col=mix(col,vec3(1.,.95,.48),smoothstep(.64,.91,h));',
' gl_FragColor=vec4(col,alpha);',
'}'].join('\n');
// One coordinate system shared by CSS, alpha masks, and the flight.
const KW_CODEX_FIRE_BOXES=[{x:76,y:58,w:188,cx:170,cy:152},{x:40,y:34,w:260,cx:170,cy:164}];
function kwCodexFirePhase(t,flying=false,reduced=false){
 if(flying)return {closed:1,open:0,closedScale:1,openScale:.15};
 if(reduced)return {closed:0,open:1,closedScale:1,openScale:1};
 const p=t/4.4,lerp=(a,b)=>Math.max(0,Math.min(1,(p-a)/(b-a)));
 const open=lerp(.17,.23)*(1-lerp(.82,.87));
 return {closed:lerp(0,.08)*(1-open),open,closedScale:.65+.35*lerp(0,.08),openScale:.15+.85*open};
}
function kwCreateCodexFire(closed,open,reduced=false,rate=1){
 const layer=document.createElement('div');layer.className='kwCodexFire';layer.setAttribute('aria-hidden','true');
 const gpu=document.createElement('canvas'),fx=document.createElement('canvas'),mask=document.createElement('canvas');
 // At the actual combat scale these pixels already exceed the displayed CSS size.
 gpu.width=240;gpu.height=212;fx.width=340;fx.height=300;mask.width=680;mask.height=300;
 layer.append(gpu,fx);gpu.className='kwCodexFireGpu';fx.className='kwCodexFireTongues';
 const ctx=fx.getContext('2d'),mc=mask.getContext('2d',{willReadFrequently:true}),images=[closed,open],contours=[null,null];
 let gl=null,program=null,buffer=null,texture=null,frame=0,stopped=false,flying=false,origin=null,last=-Infinity,mode='canvas',clock=null,uniforms=null,dirty=true;
 const listeners=[];
 function selectMode(next){mode=next;gpu.style.display=next==='webgl'?'block':'none';fx.style.display=next==='webgl'?'none':'block'}
 function dispose(){if(gl){if(texture)gl.deleteTexture(texture);if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program)}gl=null;program=null;buffer=null;texture=null}
 function stop(){if(stopped)return;stopped=true;cancelAnimationFrame(frame);for(const [img,fn] of listeners)img.removeEventListener('load',fn);dispose();layer.remove()}
 function prepare(slot){
  const img=images[slot],b=KW_CODEX_FIRE_BOXES[slot];if(!mc||!img.complete||!img.naturalWidth||contours[slot])return;
  mc.clearRect(slot*340,0,340,300);mc.drawImage(img,b.x+slot*340,b.y,b.w,b.w);
  // CPU readback happens ONCE per image, never in the animation loop.
  try{
   const a=mc.getImageData(slot*340,0,340,300).data,solid=(x,y)=>a[(y*340+x)*4+3]>100;
   const points=[];
   for(let x=20;x<320;x+=16){for(let y=12;y<288;y++){if(solid(x,y)){points.push({x,y:y+3,side:0});break}}}
   for(let y=60;y<253;y+=24){
    for(let x=12;x<170;x++){if(solid(x,y)){points.push({x:x+2,y,side:-1});break}}
    for(let x=328;x>170;x--){if(solid(x,y)){points.push({x:x-2,y,side:1});break}}
   }
   contours[slot]=points;
  }catch{contours[slot]=[]}
  dirty=true;
 }
 for(let i=0;i<2;i++){const fn=()=>{if(!stopped)prepare(i)};images[i].addEventListener('load',fn);listeners.push([images[i],fn]);prepare(i)}
 function paint(t,phase){
  if(!ctx)return;ctx.clearRect(0,0,340,300);
  for(let slot=0;slot<2;slot++){
   const points=contours[slot],b=KW_CODEX_FIRE_BOXES[slot],opacity=slot?phase.open:phase.closed,sx=slot?phase.openScale:phase.closedScale,sy=slot?1:sx;
   if(!points?.length||opacity<.005)continue;
   ctx.save();ctx.translate(b.cx,b.cy);ctx.scale(sx,sy);ctx.translate(-b.cx,-b.cy);
   for(let i=0;i<points.length;i++){
    const a=points[i],p=i*2.399963,beat=.5+.5*Math.sin(t*5.3+p),beat2=.5+.5*Math.sin(t*3.1+p*2);
    const h=(a.side?19:33)+(a.side?22:40)*beat,w=(a.side?10:14)+7*beat2,bend=Math.sin(t*4.1+p)*h*.28+a.side*10;
    const x=a.x,y=a.y,tx=x+bend,ty=y-h;
    const grad=ctx.createLinearGradient(x,y,tx,ty);
    grad.addColorStop(0,'rgba(255,223,105,.98)');grad.addColorStop(.28,'rgba(255,145,24,.96)');grad.addColorStop(.67,'rgba(251,49,16,.80)');grad.addColorStop(1,'rgba(161,29,168,0)');
    ctx.globalAlpha=opacity;ctx.fillStyle=grad;ctx.beginPath();ctx.moveTo(x-w*.62,y+5);
    ctx.bezierCurveTo(x-w*.78+a.side*6,y-h*.22,tx-w*.5,ty+h*.35,tx,ty);
    ctx.bezierCurveTo(tx+w*.13,ty+h*.42,x+w*.9+a.side*7,y-h*.24,x+w*.54,y+5);ctx.closePath();ctx.fill();
    ctx.globalAlpha=opacity*.66;ctx.fillStyle='#ffe18a';ctx.beginPath();ctx.moveTo(x-w*.18,y+4);
    ctx.quadraticCurveTo(x-w*.22,y-h*.24,x+bend*.45,y-h*.48);ctx.quadraticCurveTo(x+w*.26,y-h*.19,x+w*.20,y+4);ctx.closePath();ctx.fill();
   }
   ctx.globalCompositeOperation='lighter';
   for(let i=0;i<12;i++){const a=points[(i*7)%points.length],p=(t*(.55+(i%4)*.12)+i*.618)%1;
    ctx.globalAlpha=opacity*Math.sin(p*Math.PI)*.8;ctx.fillStyle=i%4===0?'#f4a4ff':'#ffd46d';ctx.beginPath();ctx.arc(a.x+Math.sin(p*4+i)*12+a.side*p*12,a.y-p*(54+i%5*7),1.2+(i%3)*.4,0,Math.PI*2);ctx.fill()}
   ctx.restore();
  }
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
 }
 selectMode('canvas');
 try{
  if(reduced)throw Error('Reduced motion');
  gl=gpu.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});
  if(!gl||!mc)throw Error('WebGL unavailable');
  const compile=(type,src)=>{let sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){let err=gl.getShaderInfoLog(sh);gl.deleteShader(sh);throw Error(err||'Shader compile failed')}return sh};
  let v,g;try{v=compile(gl.VERTEX_SHADER,KW_CODEX_FIRE_VERTEX);g=compile(gl.FRAGMENT_SHADER,KW_CODEX_FIRE_FRAGMENT);program=gl.createProgram();gl.attachShader(program,v);gl.attachShader(program,g);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||'Shader link failed')}finally{if(v)gl.deleteShader(v);if(g)gl.deleteShader(g)}
  buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);gl.useProgram(program);
  const pos=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  uniforms={time:gl.getUniformLocation(program,'uTime'),book:gl.getUniformLocation(program,'uBook')};
  gl.uniform1i(gl.getUniformLocation(program,'uMask'),0);gl.viewport(0,0,gpu.width,gpu.height);gl.uniform2f(gl.getUniformLocation(program,'uResolution'),gpu.width,gpu.height);gl.clearColor(0,0,0,0);selectMode('webgl');
 }catch(err){if(!reduced)console.warn('Codex fire: animated Canvas2D',err);dispose();selectMode('canvas')}
 gpu.addEventListener('webglcontextlost',e=>{e.preventDefault();if(stopped)return;gl=null;selectMode('canvas')},{once:true});
 function draw(now){
  if(stopped)return;if(origin===null){origin=now;clock=closed.getAnimations?.().find(a=>a.animationName==='kwLocalClosed')}
  // The CSS book and the effect share its actual animation clock, including delayed frames.
  const t=(now-origin)/1000,bookTime=(typeof clock?.currentTime==='number'?clock.currentTime/1000:t)*rate;
  const interval=mode==='webgl'?15:31;
  if(now-last>=interval){
   const p=kwCodexFirePhase(bookTime,flying,reduced);
   if(mode==='webgl'&&gl){
    try{
     if(dirty){gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,mask);dirty=false}
     gl.uniform1f(uniforms.time,t);gl.uniform4f(uniforms.book,p.closed,p.open,p.closedScale,p.openScale);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    }catch(e){dispose();selectMode('canvas');paint(t,p)}
   }else paint(reduced?1.5:t,p);
   last=now;
  }
  if(!reduced||!contours[1])frame=requestAnimationFrame(draw);
 }
 frame=requestAnimationFrame(draw);
 return {layer,fly(){flying=true;clock=null;layer.classList.add('isFlying')},stop};
}

function kwCodexFlightGeometry(book,hero){
 const x=book.left+book.width/2,y=book.top+book.height/2;
 const dx=hero.left+hero.width/2-x,dy=hero.top+hero.height/2-y;
 return {x,y,dx,dy,bend:Math.min(42,Math.abs(dy)*.12+8)};
}
function kwVictoryTiming(mode,reduced=false){
 const skip=mode==='skip',rate=mode==='fast'?3:1,scale=1/rate;
 return {skip,rate,scale,launch:skip?0:3980*scale,flight:skip?260:820*scale,ordinary:skip?0:(reduced?2000:2600)*scale,reducedHold:skip?0:2000*scale};
}
function kwCollectCelebrations(events){
 const out=[];
 for(const [k,v] of events||[]){
  if(k==='victory')out.push({mode:v?.mode||'normal'});
  else if(k==='codexPreview')out.push({mode:'normal',discovery:v});
  else if(k==='codexDiscovery'){
   const last=out.at(-1);
   if(last&&!last.discovery){last.discovery=v;last.mode=v?.mode||last.mode}
   else out.push({mode:v?.mode||'normal',discovery:v});
  }
 }
 return out;
}
function kwShowVictory(discovery,mode='normal'){
 if(!discovery&&(kwVictoryActive||mode==='skip'))return;
 const foeImg=mount.querySelector('.fighter.foe .fightart img');
 const portrait=discovery&&typeof discovery.portrait==='string'&&!discovery.portrait.includes('#kwasset-')?discovery.portrait:foeImg?.src;
 kwVictoryQueue.push({discovery:discovery?{...discovery,portrait}:null,mode});
 if(kwVictoryActive){if(discovery)kwVictoryInterrupt?.();return}
 function play(){
  if(!kwVictoryQueue.length){kwVictoryActive=false;return}
  kwVictoryActive=true;
  const entry=kwVictoryQueue.shift(),item=entry.discovery,lang=document.documentElement.lang,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,timing=kwVictoryTiming(entry.mode,reduced);
  const phrases=lang==='en'?['The yard is yours.','Another story for the garage.','Victory, officially approved.','The house rules have spoken.']:lang==='ru'?['Двор теперь твой.','Ещё одна история для гаража.','Победа официально одобрена.','Домовой порядок решён.']:['Der Hof gehört dir.','Eine Geschichte mehr für die Garage.','Sieg mit amtlichem Stempel.','Die Hausordnung ist zufrieden.','Der Pfand gehört dem Sieger.'];
  let next=Math.floor(Math.random()*phrases.length);
  if(next===kwVictoryLastLine)next=(next+1)%phrases.length;
  kwVictoryLastLine=next;
  const arena=mount.querySelector('.arena')?.getBoundingClientRect(),hero=mount.querySelector('#nav button:first-child')?.getBoundingClientRect(),foe=mount.querySelector('.fighter.foe .fightart')?.getBoundingClientRect();
  const player=mount.querySelector('.fighter:not(.foe) .fightart')?.getBoundingClientRect(),vs=mount.querySelector('.arena .vs')?.getBoundingClientRect();
  const gap=player&&foe?Math.max(0,foe.left-player.right):0;
  const scale=item?Math.min(.67,Math.max(.43,(gap+28||140)/280),Math.max(.35,(innerHeight-60)/300)):1;
  const x=vs?vs.left+vs.width/2:arena?arena.left+arena.width/2:innerWidth/2;
  const portraitTop=Math.min(player?.top??arena?.top??0,foe?.top??arena?.top??0);
  const y=item&&arena?Math.max(8,arena.top+3,portraitTop-136*scale):vs?Math.max(arena?.top??8,vs.top-24):arena?arena.top+Math.min(32,arena.height*.1):Math.max(12,innerHeight*.14);
  const layer=document.createElement('div'),scene=document.createElement('div');let fire=null;
  layer.className='kwVictoryOverlay'+(item?' hasDiscovery':'');layer.setAttribute('role','status');layer.setAttribute('aria-live','polite');
  scene.className='kwVictoryScene'+(item?' hasDiscovery':'')+(timing.skip?' kwCodexSkipped':'');scene.style.setProperty('--kw-victory-time',String(timing.scale));
  if(item){layer.style.left=x+'px';layer.style.top=y+'px';scene.style.setProperty('--kw-local-scale',scale);scene.style.left='0';scene.style.top='0';}
  else {scene.style.left=x+'px';scene.style.top=y+'px';}
  scene.style.setProperty('--kw-book-x',((hero?hero.left+hero.width/2:x)-x)+'px');
  scene.style.setProperty('--kw-book-y',((hero?hero.top+hero.height/2:innerHeight-30)-(y+160))+'px');
  scene.style.setProperty('--kw-soul-x',((foe?foe.left+foe.width/2:x+80)-x)+'px');
  scene.style.setProperty('--kw-soul-y',((foe?foe.top+foe.height/2:y+110)-(y+160))+'px');
  const headline=document.createElement('strong');headline.className='kwVictoryTitle';headline.textContent=lang==='en'?'VICTORY!':lang==='ru'?'ПОБЕДА!':'GEWONNEN!';
  const quote=document.createElement('span');quote.className='kwVictoryQuote';quote.textContent=phrases[next];
  scene.append(headline,quote);
  if(item){
   const visual=document.createElement('div');visual.className='kwCodexVisual';const halo=document.createElement('div');halo.className='kwCodexHalo';visual.append(halo);
   const closed=document.createElement('img'),open=document.createElement('img'),page=document.createElement('div'),soul=document.createElement('div'),ghost=document.createElement('img');
   closed.className='kwCodexClosed';closed.src=kwVictoryArt.closed;closed.alt='';
   open.className='kwCodexOpen';open.src=kwVictoryArt.open;open.alt='';
   page.className='kwCodexPage';page.setAttribute('aria-hidden','true');page.style.setProperty('--leaf',0);
   soul.className='kwCodexSoul';ghost.src=kwVictoryArt.soul;ghost.alt='';soul.append(ghost);
   const portrait=item.portrait;if(portrait&&!portrait.includes('#kwasset-')){const sticker=document.createElement('img'),placed=document.createElement('img');sticker.className='kwCodexSticker';sticker.src=portrait;sticker.alt='';soul.append(sticker);placed.className='kwCodexPageSticker';placed.src=portrait;placed.alt='';visual.append(placed)}
   visual.append(closed,open,page,soul);if(!timing.skip){fire=kwCreateCodexFire(closed,open,reduced,timing.rate);visual.prepend(fire.layer)}
   for(let n=1;n<4;n++){const leaf=page.cloneNode(false);leaf.style.setProperty('--leaf',n);visual.append(leaf)}
   const rays=document.createElement('div');rays.className='kwCodexRays';visual.prepend(rays);
   for(let n=0;n<24;n++){const spark=document.createElement('i');spark.className='kwCodexSpark';spark.style.setProperty('--angle',(n*15)+'deg');spark.style.setProperty('--reach',(35+(n%5)*10)+'px');spark.style.setProperty('--hue',[42,184,286,325,15,215][n%6]);visual.append(spark)}
   const ring=document.createElement('i');ring.className='kwCodexImpact';visual.append(ring);
   scene.append(visual);
   const info=document.createElement('div');info.className='kwCodexDiscovery';
   const title=document.createElement('b'),name=document.createElement('span'),progress=document.createElement('small');
   title.textContent=item.preview?(lang==='en'?'CODEX PREVIEW':lang==='ru'?'ПРОСМОТР КОДЕКСА':'KODEX-VORSCHAU'):(lang==='en'?'CODEX UPDATED':lang==='ru'?'КОДЕКС ПОПОЛНЕН':'KODEX ERWEITERT');
   name.textContent=item.name;
   progress.textContent=item.preview?(lang==='en'?'Example · no new entry':lang==='ru'?'Пример · без новой записи':'Beispiel · kein neuer Eintrag'):(lang==='en'?'Enemies ':lang==='ru'?'Противники ':'Gegner ')+item.foes+'/'+item.total+' · '+(lang==='ru'?'Кодекс':'Kodex')+' '+item.percent+' %';
   info.append(title,name,progress);scene.append(info);
  }
  layer.append(scene);document.body.append(layer);
  if(item){
   const visual=scene.querySelector('.kwCodexVisual'),r=visual.getBoundingClientRect(),css=getComputedStyle(visual);
   const ox=parseFloat(css.getPropertyValue('--kw-soul-origin-x')),oy=parseFloat(css.getPropertyValue('--kw-soul-origin-y'));
   const cx=r.left+ox*scale,cy=r.top+oy*scale;
   scene.style.setProperty('--kw-soul-x',((foe?foe.left+foe.width/2:x+70)-cx)/scale+'px');
   scene.style.setProperty('--kw-soul-y',((foe?foe.top+foe.height/2:y+60)-cy)/scale+'px');
  }
  let timer,launchTimer,finished=false,flight;
  function finish(){if(finished)return;finished=true;if(kwVictoryInterrupt===finish)kwVictoryInterrupt=null;clearTimeout(timer);clearTimeout(launchTimer);mount.removeEventListener('click',dismiss,true);window.removeEventListener('resize',dismiss);document.removeEventListener('scroll',dismiss,true);fire?.stop();flight?.remove();layer.remove();play()}
  function dismiss(e){if(e.type==='click'&&!e.target.closest?.('button,[role="button"]'))return;finish()}
  function launchBook(){
   if(finished)return;
   const closed=scene.querySelector('.kwCodexClosed'),target=mount.querySelector('#nav button:first-child');
   if(!closed||!target){finish();return}
   // Measure the closed pose, even after a delayed animation frame.
   closed.style.animation='none';closed.style.opacity='1';closed.style.transform='none';
   const book=closed.getBoundingClientRect(),button=target.getBoundingClientRect();
   if(!book.width||!button.width){finish();return}
   const g=kwCodexFlightGeometry(book,button);
   flight=document.createElement('div');flight.className='kwCodexFlight';flight.setAttribute('aria-hidden','true');const cover=document.createElement('img');cover.src=closed.src;cover.alt='';if(fire){fire.fly();flight.append(fire.layer)}flight.append(cover);
   flight.style.setProperty('--kw-flight-duration',timing.flight+'ms');flight.style.left=g.x+'px';flight.style.top=g.y+'px';flight.style.width=book.width+'px';flight.style.height=book.height+'px';
   flight.style.setProperty('--kw-flight-x',g.dx+'px');flight.style.setProperty('--kw-flight-y',g.dy+'px');flight.style.setProperty('--kw-flight-bend',g.bend+'px');
   document.body.append(flight);layer.remove();
   flight.addEventListener('animationend',e=>{if(e.target===flight)finish()});timer=setTimeout(finish,timing.flight+120);
  }
  if(item&&!reduced){
   // A skipped fight only deposits the already-collected entry; no page sequence.
   if(timing.skip)launchBook();else launchTimer=setTimeout(launchBook,timing.launch);
  }else{
   if(!item){kwVictoryInterrupt=finish;mount.addEventListener('click',dismiss,true);window.addEventListener('resize',dismiss);document.addEventListener('scroll',dismiss,true)}
   timer=setTimeout(finish,item?timing.reducedHold:timing.ordinary);
  }
 }
 play();
}
// Preserve the breathing cycle even when the combat engine replaces portrait nodes.
const kwPortraitIdleSeen=new WeakSet();
function kwSyncPortraitBreathing(){
 const clock=document.timeline?.currentTime;
 if(typeof clock!=='number')return;
 for(const img of mount.querySelectorAll('.heroart .portrait51>img,.arena .fightart:not(.fallen)>img')){
  if(typeof img.getAnimations!=='function')continue;
  for(const a of img.getAnimations()){
   if(a.animationName!=='kwPortraitBreath'||kwPortraitIdleSeen.has(a))continue;
   const duration=a.effect?.getTiming().duration;
   if(typeof duration!=='number'||duration<=0)continue;
   try{a.currentTime=clock%duration;kwPortraitIdleSeen.add(a)}catch{}
  }
 }
}
function apply(x){if(x.styles)document.getElementById('gameStyles').textContent=x.styles;if(x.lang)document.documentElement.lang=x.lang;
 if(x.markup!==undefined){let oldScreen=mount.querySelector('main'),oldHeading=oldScreen?.querySelector('h2')?.textContent;let scrolls=[...mount.querySelectorAll('.sheet,main,.raidArchive,.gmTimePanel,.hqInventory,.kwChatHistory,.kwAchievementList,.kwRankList,.baggrid')].map(e=>e.scrollTop);let details=[...mount.querySelectorAll('details')].map(e=>e.open);let worldOld=mount.querySelector('.worldViewport');if(worldOld)kwWorldScroll=worldOld.scrollLeft;if(!mount.firstElementChild||mount.firstElementChild.id!=='app'){mount.innerHTML=x.markup}else{let tmp=document.createElement('template');tmp.innerHTML=x.markup;let next=tmp.content.firstElementChild,cur=mount.firstElementChild;if(!next||next.id!=='app'){mount.innerHTML=x.markup}else{let parts=[...next.children],old=[...cur.children];if(parts.length!==old.length||parts.some((el,i)=>el.tagName!==old[i].tagName||el.id!==old[i].id)){mount.innerHTML=x.markup}else{for(let i=0;i<parts.length;i++){if(kwComparableMarkup(old[i],parts[i])!==parts[i].outerHTML&&!kwPatchWorldScreen(old[i],parts[i]))old[i].replaceWith(parts[i])}}}}let worldNew=mount.querySelector('.worldViewport');if(worldNew)worldNew.scrollLeft=kwWorldScroll;[...mount.querySelectorAll('.sheet,main,.raidArchive,.gmTimePanel,.hqInventory,.kwChatHistory,.kwAchievementList,.kwRankList,.baggrid')].forEach((e,i)=>e.scrollTop=e.matches('main,.kwAchievementList,.kwRankList')&&e.closest('main')?.querySelector('h2')?.textContent!==oldHeading?0:scrolls[i]||0);[...mount.querySelectorAll('details')].forEach((e,i)=>e.open=!!details[i]);}etag=x.etag||etag;
 kwSyncPortraitBreathing();
 try{AudioGame.scene(x.scene);for(const [k,v] of x.events||[]){if(k==='fx'||k==='voice')AudioGame[k](v)}for(const celebration of kwCollectCelebrations(x.events))kwShowVictory(celebration.discovery,celebration.mode);}catch(e){console.error('Game event error',e)}if(x.result?.portal){location.href='/';return}err(!kwStorageOK?'Browser blockiert lokale Speicherung. Spielstand bleibt nur bis zum Schließen erhalten.':x.result?.ok===false?x.result.reason:'');}
window.kwPlayCombatAttack=hit=>AudioGame.combatAttack(hit);
window.kwCombatFx=(sound,delay)=>setTimeout(()=>AudioGame.fx(sound),delay*1000);
let kwCombatViewPending=false;
window.kwRequestCombatView=function(){
 if(kwCombatViewPending||document.hidden)return;
 kwCombatViewPending=true;
 const refresh=()=>{
  if(busy){requestAnimationFrame(refresh);return;}
  kwCombatViewPending=false;
  send('/api/game/view');
 };
 requestAnimationFrame(refresh);
};
function kwTextEditing(){return !!document.activeElement?.matches('input:not([type=range]):not([type=checkbox]):not([type=radio]),textarea,select,[contenteditable="true"]')}
async function send(path,data){if(busy){if(path==='/api/game/action')queued=[path,data];return}busy=true;try{let x=await api(path,data);apply(x);if(mount.querySelector('#app'))window.kwBoot?.ready()}catch(e){kwTrace('ui.request.failed',{path});err(e.message+' – Verbindung wird erneut versucht.')}finally{busy=false;if(queued){let q=queued;queued=null;send(...q)}}}
function action(e,value,token=e.dataset.control){if(!token)return;let name=mount.querySelector('#profileInput');if(name&&e!==name)kwFrame.contentWindow.__profileDraft=name.value;let confirmed=!e.dataset.confirm||confirm('Diese Aktion wirklich ausführen?');if(!confirmed)return;send('/api/game/action',{token,...(value===undefined?{}:{value:String(value)}),confirmed,etag})}
function audioAction(e,value){let a=e.dataset.audio;if(!a)return;let m=a.match(/^AudioGame\.(toggle|unlock|fx|voice|set|voiceMode)\((?:'([^']*)')?(?:,this.value)?\)$/);if(!m)return;try{if(m[1]==='set')AudioGame.set(m[2],value);else AudioGame[m[1]](m[2]);}catch{}}
// A backdrop click is accepted only if the pointer also started on that same backdrop.
 // Inner controls, text selections, scroll gestures and mandatory dialogs stay untouched.
 function kwBackdropToken(target){return target?.matches?.('#modal:not([hidden])[data-backdrop-control]')?target.dataset.backdropControl:null}
 let kwBackdropDown=null;
 mount.addEventListener('pointerdown',ev=>{kwBackdropDown=ev.isPrimary!==false&&ev.button===0?kwBackdropToken(ev.target):null});
 mount.addEventListener('pointercancel',()=>{kwBackdropDown=null});
 mount.addEventListener('click',ev=>{
  const token=kwBackdropToken(ev.target),started=kwBackdropDown;kwBackdropDown=null;
  if(token){if(token===started){ev.preventDefault();editing=false;action(ev.target,undefined,token)}return;}
  let e=ev.target.closest('[data-control]');if(!e||e.matches('input,select')||e.disabled)return;ev.preventDefault();editing=false;audioAction(e);action(e)
 });
mount.addEventListener('focusin',ev=>{if(ev.target.matches('input,select'))editing=true});mount.addEventListener('focusout',()=>{editing=false});mount.addEventListener('pointerdown',ev=>{if(ev.target.matches('input[type=range]')||ev.target.closest('.worldViewport'))editing=true});mount.addEventListener('pointercancel',()=>{editing=false});document.addEventListener('pointerup',()=>{editing=false});
mount.addEventListener('input',ev=>{let t=ev.target;if(t.id!=='invQtyRange')return;let n=Number(t.value),max=t.max,unit=Number(t.dataset.invUnit),text=mount.querySelector('#invQtyText'),value=mount.querySelector('#invQtyValue');if(text)text.textContent=n+' / '+max;if(value)value.textContent='$'+(n*unit).toLocaleString(document.documentElement.lang==='en'?'en-US':document.documentElement.lang==='ru'?'ru-RU':'de-DE');});
mount.addEventListener('keydown',ev=>{if(ev.target.id==='warehouseSearch47'&&ev.key==='Enter'){ev.preventDefault();ev.target.blur()}});
mount.addEventListener('change',ev=>{let e=ev.target.closest('[data-control]');if(!e)return;editing=false;if(e.id==='profileInput'){kwFrame.contentWindow.__profileDraft=e.value;return}audioAction(e,e.value);action(e,e.value)});
let lastWorldScroll=0;mount.addEventListener('scroll',ev=>{if(ev.target.matches?.('.worldViewport'))lastWorldScroll=Date.now()},true);

/* v0.55 live UI: spotlight plus drag-and-drop editor, outside the replicated engine DOM. */
const kwUI55=document.createElement('div');kwUI55.id='kwUI55';document.body.append(kwUI55);
const kwStyleUI55=document.createElement('style');kwStyleUI55.textContent='#kwUI55{position:fixed;inset:0;z-index:2147483000;pointer-events:none;font:14px/1.35 system-ui,sans-serif;color:#f8e8d2}#kwUI55 [hidden]{display:none!important}.kw55Shade{position:absolute;inset:0;background:#130e18a8;pointer-events:auto}.kw55Ring{position:absolute;border:2px solid #ffd579;border-radius:8px;box-shadow:0 0 0 3px #1c151dcc,0 0 16px #ffcc7277;pointer-events:none;transition:none}.kw55Tip{position:absolute;width:min(350px,calc(100vw - 24px));box-sizing:border-box;background:#201923;border:1px solid #d7a45b;border-radius:12px;box-shadow:0 8px 30px #000a;padding:12px;pointer-events:auto;display:grid;gap:8px;max-height: min(52dvh,360px);overflow:auto}.kw55Tip h3{margin:0;font-size:17px;color:#ffe0a3}.kw55Tip p{margin:0;font-size:13px;line-height:1.4}.kw55Tip button,.kw55Editor button,.kw55Editor select,.kw55Editor input,.kw55Editor textarea{font:inherit;color:#f8e8d2;background:#382a38;border:1px solid #a77c4c;border-radius:6px;padding:7px;min-height:34px;box-sizing:border-box}.kw55Tip button.kw55Primary{background:#c18a42;color:#201923;font-weight:700}.kw55Tip .kw55Meta{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#d6b789;gap:8px}.kw55Tip .kw55Actions{display:flex;flex-wrap:wrap;gap:6px}.kw55Tip .kw55Exit{background:none;border:none;min-height:24px;padding:1px 4px;color:#d6b789}.kw55Progress{height:3px;background:#493746;border-radius:3px}.kw55Progress i{display:block;height:100%;background:#e6b76c;border-radius:3px}.kw55Editor{position:absolute;right:8px;top:70px;width:min(250px,calc(100vw - 16px));max-height:calc(100dvh - 145px);overflow:auto;pointer-events:auto;background:#211923f2;padding:9px;border:1px solid #c69a58;border-radius:9px;display:grid;gap:7px;box-shadow:0 4px 20px #0008}.kw55Editor label{display:grid;grid-template-columns:55px 1fr 38px;align-items:center;gap:4px}.kw55Editor input{width:100%;padding:0;min-height:24px}.kw55Editor select,.kw55Editor textarea{width:100%}.kw55Editor textarea{min-height:75px;user-select:text}.kw55Editor .kw55EditorRow{display:flex;gap:5px;flex-wrap:wrap}.kw55Editor small{color:#d6b789}';document.head.append(kwStyleUI55);
const kwShade55=document.createElement('div'),kwRing55=document.createElement('div'),kwTip55=document.createElement('section'),kwEditor55=document.createElement('section');kwShade55.className='kw55Shade';kwRing55.className='kw55Ring';kwTip55.className='kw55Tip';kwTip55.setAttribute('aria-label','Tutorial');kwEditor55.className='kw55Editor';for(const e of [kwShade55,kwRing55,kwTip55,kwEditor55]){e.hidden=true;kwUI55.append(e)}
let kwTourData55=null,kwTourKey55='',kwEditorData55=null,kwEditorKey55='',kwLastTarget55=null,kwDrag55=null,kwEditorExpanded55=window.innerWidth>=700;
function kwText55(tag,text,parent){const e=document.createElement(tag);e.textContent=text;parent.append(e);return e}
function kwButton55(parent,text,fn,cls=''){const e=kwText55('button',text,parent);e.type='button';e.className=cls;e.addEventListener('click',fn);return e}
async function kwCall55(method,...args){const ready=kwReady;try{await ready;for(let i=0;busy&&i<80;i++)await new Promise(r=>setTimeout(r,25));if(busy||ready!==kwReady)return;const w=kwFrame.contentWindow;if(w[method]?.(...args)!==false)await send('/api/game/view');else if(method==='__layout55')err('Placement: Aktion nicht möglich oder JSON ungültig.')}catch(e){err(e.message)}}
function kwTourPosition55(){const m=kwTourData55;if(!m||kwTip55.hidden)return;const W=window.innerWidth,H=window.innerHeight;let el=m.target?mount.querySelector(m.target):null;let r=el?.getBoundingClientRect();if(r){let a=el.closest('.worldViewport,main,.sheet');if(a&&a!==el){const b=a.getBoundingClientRect();r={left:Math.max(r.left,b.left),right:Math.min(r.right,b.right),top:Math.max(r.top,b.top),bottom:Math.min(r.bottom,b.bottom)};r.width=r.right-r.left;r.height=r.bottom-r.top}}
 const visible=r&&r.width>2&&r.height>2&&r.right>0&&r.left<W&&r.bottom>0&&r.top<H;
 kwRing55.hidden=!visible;
 if(visible){const l=Math.max(2,r.left-3),top=Math.max(2,r.top-3);Object.assign(kwRing55.style,{left:l+'px',top:top+'px',width:Math.max(0,Math.min(W-2,r.right+3)-l)+'px',height:Math.max(0,Math.min(H-2,r.bottom+3)-top)+'px'})}
 const tw=kwTip55.offsetWidth,th=kwTip55.offsetHeight;
 let x=(W-tw)/2,y=(H-th)/2;
 if(m.n!==0){if(visible){x=Math.max(8,Math.min(W-tw-8,(r.left+r.right-tw)/2));const bottom=r.bottom+10,top=r.top-th-10;if(bottom+th<=H-8)y=bottom;else if(top>=8)y=top;else if(W-r.right>=tw+12){x=r.right+8;y=Math.max(8,Math.min(H-th-8,r.top))}else if(r.left>=tw+12){x=r.left-tw-8;y=Math.max(8,Math.min(H-th-8,r.top))}else y=r.top>H/2?8:H-th-8}else y=H-th-12}
 Object.assign(kwTip55.style,{left:Math.max(8,x)+'px',top:Math.max(8,y)+'px'});
}
function kwTourDraw55(m){kwTourData55=m;if(!m){kwTip55.hidden=kwRing55.hidden=kwShade55.hidden=true;kwTourKey55='';kwLastTarget55=null;return}
 const key=JSON.stringify(m),targetKey=m.n+'|'+m.target+'|'+m.route;kwShade55.hidden=m.n!==0;kwTip55.hidden=false;
 if(key!==kwTourKey55){kwTourKey55=key;kwTip55.replaceChildren();const meta=kwText55('div','',kwTip55);meta.className='kw55Meta';kwText55('span',m.n===0?'KURVFLICT':m.n+' / '+m.total,meta);kwButton55(meta,m.skip,()=>kwCall55('__tour55','exit'),'kw55Exit');if(m.n){const p=kwText55('div','',kwTip55);p.className='kw55Progress';kwText55('i','',p).style.width=(m.n/m.total*100)+'%'}kwText55('h3',m.title,kwTip55);kwText55('p',m.body,kwTip55);const actions=kwText55('div','',kwTip55);actions.className='kw55Actions';if(m.closeModal)kwButton55(actions,m.closeLabel,()=>kwCall55('__tour55','close'),'kw55Primary');else if(m.route)kwButton55(actions,m.routeLabel,()=>kwCall55('__tour55','route'),'kw55Primary');else if(m.next)kwButton55(actions,m.next,()=>kwCall55('__tour55','next'),'kw55Primary');if(m.skipStep)kwButton55(actions,m.skipStep,()=>kwCall55('__tour55','skip')); }
 if(kwLastTarget55!==targetKey){kwLastTarget55=targetKey;const el=m.target&&mount.querySelector(m.target);if(el){const r=el.getBoundingClientRect();const vp=el.closest('.worldViewport,main,.sheet'),v=vp?.getBoundingClientRect();if(r.left<0||r.right>innerWidth||r.top<0||r.bottom>innerHeight||v&&(r.left<v.left||r.right>v.right||r.top<v.top||r.bottom>v.bottom))el.scrollIntoView({block:'nearest',inline:'center',behavior:'instant'})}}
 kwTourPosition55();
}
async function kwPublishPlacement55(){if(!kwEditorData55||!window.KW_GM_REMOTE55)return;if(!confirm('Diese Positionen jetzt für alle Spieler auf main veröffentlichen?'))return;const layout=JSON.parse(JSON.stringify(kwEditorData55.layout));editing=true;mount.inert=true;kwEditor55.inert=true;try{const sha=await window.kwGMPublish55(layout);alert('Layout auf main gespeichert (Commit '+sha.slice(0,7)+'). GitHub Pages aktualisiert den bestehenden Spiellink nach dem Deployment.')}catch(e){alert(e.message)}finally{mount.inert=false;kwEditor55.inert=false;editing=false}}
function kwEditorDraw55(m){kwEditorData55=m;if(!m){kwEditor55.hidden=true;kwEditorKey55='';return}kwEditor55.hidden=false;const key=JSON.stringify(m)+'|'+kwEditorExpanded55;if(kwEditorKey55===key)return;kwEditorKey55=key;kwEditor55.replaceChildren();const header=kwText55('div','',kwEditor55);header.className='kw55EditorRow';kwText55('b','World Placement',header);kwButton55(header,kwEditorExpanded55?'−':'+',()=>{kwEditorExpanded55=!kwEditorExpanded55;kwEditorDraw55(kwEditorData55)});if(window.KW_GM_REMOTE55)kwButton55(header,'Live veröffentlichen',kwPublishPlacement55);kwEditor55.style.width=kwEditorExpanded55?'':'auto';if(!kwEditorExpanded55)return;kwText55('small','Ziehen: Position ändern. Karte außerhalb der Objekte scrollen.',kwEditor55);const select=kwText55('select','',kwEditor55);for(const item of m.items){const o=kwText55('option',item.name,select);o.value=item.id;o.selected=item.id===m.selected}select.onchange=()=>{const el=mount.querySelector('[data-map-id="'+select.value+'"]');el?.scrollIntoView({block:'nearest',inline:'center'});kwCall55('__layout55','select',select.value)};
 const v=m.layout[m.selected];for(const [k,label,min,max,step] of [['x','X %',1,99,.1],['y','Y %',1,99,.1],['scale','Größe',.4,2.5,.05],['z','Ebene',1,20,1]]){const l=kwText55('label','',kwEditor55);kwText55('span',label,l);const inp=kwText55('input','',l);Object.assign(inp,{type:'range',min,max,step,value:v[k]});const val=kwText55('span',String(v[k]),l);inp.oninput=()=>{val.textContent=inp.value;const el=mount.querySelector('[data-map-id="'+m.selected+'"]');if(!el)return;const n=Number(inp.value);if(k==='x')el.style.left=n+'%';if(k==='y')el.style.top=n+'%';if(k==='z')el.style.zIndex=n;if(k==='scale'){if(el.classList.contains('world45Npc')){const special=el.classList.contains('worldMopo50');el.style.width=(n*(special?7:8))+'%';el.style.height=(n*(special?18:29))+'%'}else el.style.transform='translate(-50%,-50%) scale('+n+')'}};inp.addEventListener('pointerdown',()=>{editing=true});inp.onchange=()=>{editing=false;kwCall55('__layout55','update',m.selected,{[k]:Number(inp.value)})}}
 const buttons=kwText55('div','',kwEditor55);buttons.className='kw55EditorRow';const area=kwText55('textarea','',kwEditor55);area.hidden=true;area.placeholder='Placement JSON';kwButton55(buttons,'Export',()=>{area.hidden=false;area.value=JSON.stringify(kwEditorData55.layout,null,2);area.focus();area.select()});kwButton55(buttons,'Import',()=>{if(area.hidden){area.hidden=false;area.focus();return}try{kwCall55('__layout55','import',null,JSON.parse(area.value))}catch(e){err('Ungültiges Placement JSON.')}});kwButton55(buttons,'Reset',()=>{if(confirm('Standard-Placement wiederherstellen?'))kwCall55('__layout55','reset')});}
window.addEventListener('pointerdown',e=>{if(!kwEditorData55||e.button!==0)return;const el=e.target.closest?.('.kw55Editing [data-map-id]');if(!el)return;const strip=el.closest('.world45Strip'),v=kwEditorData55.layout[el.dataset.mapId];if(!strip||!v)return;e.preventDefault();e.stopImmediatePropagation();editing=true;kwDrag55={el,strip,id:el.dataset.mapId,pointer:e.pointerId,x:e.clientX,y:e.clientY,oldX:v.x,oldY:v.y,nextX:v.x,nextY:v.y};try{el.setPointerCapture(e.pointerId)}catch{}},true);
window.addEventListener('pointermove',e=>{const d=kwDrag55;if(!d||e.pointerId!==d.pointer)return;e.preventDefault();e.stopImmediatePropagation();const r=d.strip.getBoundingClientRect();d.nextX=Math.max(1,Math.min(99,d.oldX+(e.clientX-d.x)*100/r.width));d.nextY=Math.max(1,Math.min(99,d.oldY+(e.clientY-d.y)*100/r.height));d.el.style.left=d.nextX+'%';d.el.style.top=d.nextY+'%'},true);
function kwDragEnd55(e){const d=kwDrag55;if(!d||e.pointerId!==d.pointer)return;e.preventDefault();e.stopImmediatePropagation();kwDrag55=null;editing=false;try{d.el.releasePointerCapture(d.pointer)}catch{}if(e.type==='pointercancel'){d.el.style.left=d.oldX+'%';d.el.style.top=d.oldY+'%';return}kwCall55('__layout55','update',d.id,{x:d.nextX,y:d.nextY})}
window.addEventListener('pointerup',kwDragEnd55,true);window.addEventListener('pointercancel',kwDragEnd55,true);window.addEventListener('click',e=>{if(kwEditorData55&&e.target.closest?.('.kw55Editing [data-map-id]')){e.preventDefault();e.stopImmediatePropagation()}},true);
window.addEventListener('resize',kwTourPosition55);document.addEventListener('scroll',kwTourPosition55,true);
const kwApply55=apply;apply=function(x){if(kwDrag55)return;kwApply55(x);kwEditorDraw55(x.editor55||null);kwTourDraw55(x.tour55||null)};

async function boot(){try{let x=await api('/api/me');if(!x.account){location.href='/';return}csrf=x.csrf;window.kwBoot?.stage('Spielstand und Oberfläche laden …',97);const view=await api('/api/game/view');apply(view);if(!mount.querySelector('#app'))throw Error('Spieloberfläche konnte nicht aufgebaut werden.');window.kwBoot?.ready();setInterval(()=>{if(!document.hidden&&!busy&&!editing&&!kwTextEditing()&&Date.now()-lastWorldScroll>220)send('/api/game/poll',{etag})},1000)}catch(e){err(e.message);window.kwBoot?.fail(e.message)}}document.addEventListener('visibilitychange',()=>{if(document.hidden){try{kwFrame.contentWindow.__save48?.()}catch{}}else if(!busy&&!editing&&!kwTextEditing())send('/api/game/poll',{etag})});window.addEventListener('pagehide',()=>{try{kwFrame.contentWindow.__save48?.()}catch{}});boot();window.kwGMStart55?.();
