(function(root){
'use strict';
const C=root.KW_COMMERCIAL_CONFIG||{};
const categories=['bug','idea','balance','feedback','contact'];
const labels={
de:{feedback:'Feedback',bug:'Bug melden',idea:'Idee / Feature',balance:'Balancing',contact:'Kontakt / Werbepartner',title:'Feedback & Kontakt',subject:'Betreff',message:'Beschreibung / Vorschlag',rating:'Spielbewertung (optional)',none:'Keine Bewertung',context:'Technische Angaben beifügen (Version, Plattform, Sprache)',notice:'Keine privaten Daten, Zugangsdaten oder Spielstände eintragen. GitHub-Meldungen sind öffentlich und benötigen ein GitHub-Konto.',private:'Privates Kontaktformular öffnen',public:'GitHub-Meldung vorbereiten',copy:'Text kopieren',download:'Bericht herunterladen',close:'Schließen',copied:'Kopiert.',fallback:'Text markieren und kopieren oder herunterladen.',ready:'GitHub öffnet einen Entwurf. Erst dort absenden.',slot:'Werbefläche · frei',sponsor:'Werbepartner werden',ad:'Anzeige',required:'Bitte Betreff und Beschreibung ausfüllen.',preview:'Berichtsvorschau'},
en:{feedback:'Feedback',bug:'Report a bug',idea:'Idea / feature',balance:'Balancing',contact:'Contact / advertising',title:'Feedback & contact',subject:'Subject',message:'Description / suggestion',rating:'Game rating (optional)',none:'No rating',context:'Include technical details (version, platform, language)',notice:'Do not enter personal data, credentials or save files. GitHub reports are public and require a GitHub account.',private:'Open private contact form',public:'Prepare GitHub report',copy:'Copy text',download:'Download report',close:'Close',copied:'Copied.',fallback:'Select and copy the text or download it.',ready:'GitHub opens a draft. Submit it there.',slot:'Advertising space · available',sponsor:'Become a sponsor',ad:'Advertisement',required:'Enter a subject and description.',preview:'Report preview'},
ru:{feedback:'Отзыв',bug:'Сообщить об ошибке',idea:'Идея / функция',balance:'Баланс',contact:'Контакты / реклама',title:'Отзывы и связь',subject:'Тема',message:'Описание / предложение',rating:'Оценка игры (необязательно)',none:'Без оценки',context:'Добавить технические данные (версия, платформа, язык)',notice:'Не вводите личные данные, пароли или файлы сохранений. Отчёты GitHub публичны и требуют аккаунт.',private:'Открыть приватную форму',public:'Подготовить отчёт GitHub',copy:'Копировать',download:'Скачать отчёт',close:'Закрыть',copied:'Скопировано.',fallback:'Выделите текст для копирования или скачайте его.',ready:'GitHub откроет черновик. Отправьте его там.',slot:'Рекламное место свободно',sponsor:'Стать партнёром',ad:'Реклама',required:'Заполните тему и описание.',preview:'Предпросмотр отчёта'}
};
function platform(env={}){
 const native=env.native||'';
 if(native==='android')return 'android-app';
 if(native==='ios')return 'ios-app';
 if(native==='steam')return 'steam';
 if(env.mobile||/Android|iPhone|iPad|iPod/i.test(env.ua||'')||(/Macintosh/i.test(env.ua||'')&&env.touch>1)||env.coarse)return 'mobile-web';
 return 'desktop-web';
}
function safeHttps(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}}
function sponsor(value){
 if(!value||typeof value.label!=='string'||!value.label.trim()||!/^assets\/sponsors\/[a-zA-Z0-9_-]+\.(webp|png|jpg|jpeg)$/.test(value.image||''))return null;
 const url=safeHttps(value.url);return url?{label:value.label.trim().slice(0,100),image:value.image,url}:null;
}
function report(data,context={}){
 const category=categories.includes(data.category)?data.category:'feedback';
 const title=String(data.subject||'').trim().slice(0,100),message=String(data.message||'').trim().slice(0,1800);
 if(!title||!message)return null;
 const rating=Number(data.rating);let body=message;
 if(Number.isInteger(rating)&&rating>=1&&rating<=5)body+='\n\nRating: '+rating+'/5';
 if(data.context)body+='\n\n---\nGame: KURVFLICT\nVersion: '+String(context.version||'unknown').slice(0,40)+'\nPlatform: '+String(context.platform||'unknown').slice(0,40)+'\nLanguage: '+String(context.lang||'de').slice(0,10)+'\nBuild: '+(context.gm?'GM/test':'public');
 return {title:'['+category+'] '+title,body};
}
function issueDraft(url,r){const safe=safeHttps(url);if(!safe||!r)return '';const u=new URL(safe);if(u.origin!=='https://github.com'||u.pathname!=='/XxFallenAngelxX/kurwa-wars-alpha/issues/new')return '';u.searchParams.set('title',r.title);u.searchParams.set('body',r.body);return u.href}
root.KWCommercial=Object.freeze({platform,sponsor,report,issueDraft,safeHttps});
if(!root.document)return;
const doc=root.document,gm=/\/gm\.html$/i.test(root.location.pathname);
const native=()=>{try{return root.Capacitor?.isNativePlatform?.()?root.Capacitor.getPlatform():''}catch{return ''}};
const currentPlatform=()=>platform({native:native(),mobile:root.navigator.userAgentData?.mobile,ua:root.navigator.userAgent,touch:root.navigator.maxTouchPoints,coarse:root.matchMedia('(pointer:coarse)').matches});
const lang=()=>labels[doc.documentElement.lang]?doc.documentElement.lang:'de';
const text=()=>labels[lang()];
const el=(tag,cls,value)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n};
const add=(parent,...children)=>{parent.append(...children);return parent};
const button=(label,fn)=>{const b=el('button','',label);b.type='button';b.addEventListener('click',fn);return b};
const anchor=(label,url)=>{const a=el('a','kwCommercialLink',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a};
const dialog=el('dialog','kwFeedbackDialog');dialog.id='kwFeedbackDialog';dialog.setAttribute('aria-labelledby','kwFeedbackTitle');doc.body.append(dialog);
let draft={category:'feedback',subject:'',message:'',rating:'',context:true};
function openFeedback(category){
 if(dialog.open)return;
 const L=text();if(categories.includes(category))draft.category=category;
 dialog.replaceChildren();
 const title=el('h2','',L.title);title.id='kwFeedbackTitle';
 const head=add(el('div','kwFeedbackHead'),title,button('×',()=>dialog.close()));head.lastChild.setAttribute('aria-label',L.close);
 const form=el('form','kwFeedbackForm');form.addEventListener('submit',e=>e.preventDefault());
 const select=el('select');for(const k of categories){const o=el('option','',L[k]);o.value=k;select.append(o)}select.value=draft.category;
 const subject=el('input');subject.type='text';subject.maxLength=100;subject.required=true;subject.value=draft.subject;
 const message=el('textarea');message.maxLength=1800;message.rows=5;message.required=true;message.value=draft.message;
 const rating=el('select');for(const val of ['',1,2,3,4,5]){const o=el('option','',val?val+' / 5':L.none);o.value=val;rating.append(o)}rating.value=draft.rating;
 const consent=el('input');consent.type='checkbox';consent.checked=draft.context;
 function field(label,input){return add(el('label','kwFeedbackField'),el('span','',label),input)}
 const remember=()=>{draft={category:select.value,subject:subject.value,message:message.value,rating:rating.value,context:consent.checked}};
 form.addEventListener('input',remember);form.addEventListener('change',remember);
 const notice=el('p','kwFeedbackNotice',L.notice),status=el('p','kwFeedbackStatus');status.setAttribute('role','status');
 const preview=el('textarea');preview.readOnly=true;preview.rows=4;preview.hidden=true;preview.setAttribute('aria-label',L.preview);
 function getReport(){remember();if(!form.reportValidity()){status.textContent=L.required;return null}const r=report(draft,{version:doc.querySelector('#mount .gameVersion')?.textContent,platform:currentPlatform(),lang:lang(),gm});if(!r){status.textContent=L.required;return null}preview.value=r.title+'\n\n'+r.body;preview.hidden=false;return r}
 const actions=el('div','kwFeedbackActions');
 const publicUrl=issueDraft(C.issueUrl,{title:'Feedback',body:''});
 if(publicUrl){const a=anchor(L.public,publicUrl);a.addEventListener('click',e=>{const r=getReport();if(!r){e.preventDefault();return}a.href=issueDraft(C.issueUrl,r);status.textContent=L.ready});actions.append(a)}
 const privateUrl=safeHttps(C.privateFeedbackUrl);if(privateUrl)actions.append(anchor(L.private,privateUrl));
 actions.append(button(L.copy,async()=>{if(!getReport())return;try{await root.navigator.clipboard.writeText(preview.value);status.textContent=L.copied}catch{preview.focus();preview.select();status.textContent=L.fallback}}),button(L.download,()=>{if(!getReport())return;const url=URL.createObjectURL(new Blob([preview.value],{type:'text/plain;charset=utf-8'}));const a=el('a');a.href=url;a.download='kurvflict-feedback.txt';doc.body.append(a);a.click();a.remove();root.setTimeout(()=>URL.revokeObjectURL(url),1000)}));
 add(form,field(L.feedback,select),field(L.subject,subject),field(L.message,message),field(L.rating,rating),add(el('label','kwFeedbackConsent'),consent,el('span','',L.context)),notice,actions,status,preview);
 add(dialog,head,form);dialog.showModal();
}
dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()});
doc.getElementById('mount')?.addEventListener('click',e=>{const b=e.target.closest?.('[data-kw-feedback]');if(!b)return;e.preventDefault();openFeedback()});
function renderRails(){
 const p=currentPlatform(),show=!gm&&p==='desktop-web';
 doc.documentElement.dataset.kwPlatform=p;doc.body.classList.toggle('kwSponsorDesktop',show);
 for(const side of ['left','right']){
  const rail=doc.getElementById(side==='left'?'kwSponsorLeft':'kwSponsorRight');if(!rail)continue;
  rail.hidden=!show;rail.replaceChildren();if(!show)continue;
  const L=text(),slot=sponsor(C.slots?.[side]);rail.setAttribute('aria-label',L.ad);
  if(slot){const a=anchor(slot.label,slot.url),img=el('img');img.src=slot.image;img.alt=slot.label;img.loading='lazy';a.rel+=' sponsored';a.replaceChildren(img);a.addEventListener('error',()=>{},false);img.addEventListener('error',()=>{a.replaceChildren(el('span','',slot.label))});add(rail,el('small','',L.ad),a)}
  else add(rail,el('small','',L.slot),button(L.sponsor,()=>openFeedback('contact')));
 }
}
renderRails();new MutationObserver(renderRails).observe(doc.documentElement,{attributes:true,attributeFilter:['lang']});root.matchMedia('(pointer:coarse)').addEventListener?.('change',renderRails);
})(typeof window!=='undefined'?window:globalThis);
