// Setup checklist, Waiting on others, Trust page, Smart actions. Local only; nothing is ever sent.
(function(){
 if(typeof view!=='function'||typeof render!=='function'||typeof TABS==='undefined')return;
 const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const LS=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},SS=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
 const waOn=()=>!!(API.authed&&API.status.some(c=>/^whatsapp$/i.test(c.provider||'')));
 const css=document.createElement('style');css.textContent='.sa{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0;align-items:center}.sa .lbl{font-size:12px;opacity:.7;width:100%}.sa button,.sa a{font:inherit;font-size:12px;padding:4px 10px;border-radius:14px;border:1px solid #83e7bb;background:#f2fbf6;color:#101216;cursor:pointer;text-decoration:none}.sa-b{display:inline-block;font-size:11px;padding:1px 7px;border-radius:10px;background:#e8f7f0;color:#101216;margin:4px 4px 0 0}.ck{display:flex;gap:8px;align-items:flex-start;margin:6px 0}.ck i{width:20px;height:20px;border-radius:50%;border:2px solid #83e7bb;flex:none;display:grid;place-items:center;font-style:normal;font-size:13px}.ck.ok i{background:#83e7bb;color:#101216}#sa-ov{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:12px}#sa-box{background:#fff;color:#101216;border-radius:14px;padding:18px;max-width:440px;width:100%}';document.head.appendChild(css);
 TABS.splice(TABS.findIndex(t=>t[0]==='about')+1,0,['trust','Trust & privacy','MAS']);
 // ================= Smart actions engine =================
 const DAYS=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'],MON=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
 const dubaiNow=()=>new Date(Date.now()+4*36e5);               // use getUTC* for Dubai wall-clock
 const mk=(y,mo,d,h,mi)=>new Date(Date.UTC(y,mo,d,h,mi)-4*36e5); // Dubai wall-clock -> real instant
 function parseWhen(text){const t=String(text||'').toLowerCase(),n=dubaiNow();let y=n.getUTCFullYear(),mo=n.getUTCMonth(),d=n.getUTCDate(),h=null,mi=0,day=false,m;
  if(m=t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/)){h=+m[1]%12+(m[3]=='pm'?12:0);mi=+(m[2]||0)}
  else if(m=t.match(/\b(?:at|@)\s*(\d{1,2})(?::(\d{2}))?\b(?!\s*(?:st|nd|rd|th|\/))/)){h=+m[1];mi=+(m[2]||0);if(h>=1&&h<=7)h+=12}
  else if(m=t.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/)){h=+m[1];mi=+m[2]}
  const set=dt=>{y=dt.getUTCFullYear();mo=dt.getUTCMonth();d=dt.getUTCDate();day=true};
  if(/\btomorrow\b/.test(t))set(new Date(Date.UTC(y,mo,d+1)));
  else if(/\b(today|tonight)\b/.test(t)){day=true}
  else if(m=t.match(/\b(?:(next|this|on)\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/)){const wd=DAYS.indexOf(m[2]);let add=(wd-n.getUTCDay()+7)%7;if(m[1]=='next'&&add<7)add=add||7;set(new Date(Date.UTC(y,mo,d+add)))}
  else if(m=t.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/)||t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?\b/)){const a=isNaN(+m[1])?[m[2],m[1]]:[m[1],m[2]],dd=+a[0],mm=MON.indexOf(a[1].slice(0,3));let yy=y;if(mm<mo||(mm==mo&&dd<d))yy++;set(new Date(Date.UTC(yy,mm,dd)))}
  else if(m=t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)){if(+m[2]>=1&&+m[2]<=12&&+m[1]<=31){let yy=m[3]?(+m[3]<100?2000+ +m[3]:+m[3]):y;set(new Date(Date.UTC(yy,+m[2]-1,+m[1])))}}
  if(h===null&&!day)return null;
  let guessed=false;if(h===null){h=9;mi=0;guessed=true}
  let when=mk(y,mo,d,h,mi);if(!day&&when<new Date())when=new Date(when.getTime()+864e5);
  return {when,guessed}}
 const fmtWhen=w=>w.toLocaleString('en-GB',{timeZone:'Asia/Dubai',weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false});
 const DEF={
  calendar:{label:'Meeting / call',words:['meeting','call','appointment',"let's meet",'catch up','zoom','site visit','demo','tomorrow at 3','Monday 10am','5pm']},
  finance:{label:'Finance',words:['invoice','quote','quotation','pay','payment due','overdue','EFT','bank details','outstanding']},
  urgent:{label:'Urgent',words:['urgent','asap','today','deadline','by Friday','eod']},
  waiting:{label:'Waiting for',words:['send me','please send','documents','attach','attachment','photos','pictures']},
  guest:{label:'Guest',words:['check-in','check-out','booking','guest','reservation']},
  done:{label:'Thanks / done',words:['thanks','thank you','ok','okay','confirmed','noted','received']},
  chaser:{label:'Follow-up',words:['follow up','following up','chase','waiting for','waiting on','any update','reminder']}};
 const RX={calendar:/\b(meeting|call|appointment|let'?s meet|catch up|zoom|site visit|demo)\b/i,finance:/\b(invoice|quote|quotation|pay|payment due|overdue|eft|bank details|outstanding)\b/i,urgent:/\b(urgent|asap|today|deadline|by (monday|tuesday|wednesday|thursday|friday|saturday|sunday|eod|tomorrow)|eod)\b/i,waiting:/\b(send me|please send|documents?|attach(ed|ment)?|photos?|pictures?)\b/i,guest:/\b(check[- ]?in|check[- ]?out|booking|guest|reservation)\b/i,done:/\b(thanks|thank you|ok|okay|confirmed|noted|received)\b/i,chaser:/\b(follow(ing)?[- ]?up|chase|chasing|waiting (for|on)|any update|reminder)\b/i};
 const ACT_IDS=Object.keys(DEF);
 const customRules=()=>LS('lr-sa-rules',[]);
 function analyze(text){const t=String(text||''),out=[],has=k=>RX[k].test(t);const w=parseWhen(t);
  const hit=new Set(ACT_IDS.filter(k=>has(k)));
  if(!(hit.has('calendar')||(w&&!w.guessed)))hit.delete('calendar');else if(w&&!w.guessed||hit.has('calendar'))hit.add('calendar');
  if(hit.has('calendar')&&!w)out.push({k:'calendar',when:{when:mk(dubaiNow().getUTCFullYear(),dubaiNow().getUTCMonth(),dubaiNow().getUTCDate()+1,9,0),guessed:true}});
  else if(hit.has('calendar'))out.push({k:'calendar',when:w});
  ['finance','urgent','waiting','guest','done','chaser'].forEach(k=>{if(hit.has(k))out.push({k})});
  customRules().forEach(r=>{if(r&&r.word&&ACT_IDS.includes(r.action)&&t.toLowerCase().includes(String(r.word).toLowerCase())&&!out.some(o=>o.k===r.action))out.push({k:r.action,custom:r.word,when:r.action==='calendar'?(w||{when:mk(dubaiNow().getUTCFullYear(),dubaiNow().getUTCMonth(),dubaiNow().getUTCDate()+1,9,0),guessed:true}):undefined})});
  const contacts=[];
  (t.match(/(?:\+|\b00)\d[\d\s().-]{7,16}\d|\b0\d[\d\s-]{7,12}\d|\b\d{9,13}\b/g)||[]).map(x=>x.trim()).filter(x=>x.replace(/\D/g,'').length>=9&&x.replace(/\D/g,'').length<=15&&!/^\d{4}-\d{2}-\d{2}/.test(x)).slice(0,2).forEach(x=>contacts.push({type:'phone',v:x}));
  (t.match(/https?:\/\/[^\s<>"')]+/g)||[]).slice(0,2).forEach(x=>contacts.push({type:'link',v:x.replace(/[.,;:!?]+$/,'')}));
  const ad=t.match(/\b\d{1,4}\s+[A-Za-z][A-Za-z ]{2,30}\s(street|st|road|rd|avenue|ave|building|tower|villa|apartment|apt|way|lane|boulevard|blvd)\b[^.\n]{0,30}/i);if(ad)contacts.push({type:'address',v:ad[0].trim()});
  return {acts:out,contacts}}
 const BADGE={calendar:'Meeting',finance:'Finance',urgent:'Urgent',waiting:'Waiting for',guest:'Guest',done:'Thanks / done',chaser:'Follow-up'};
 // ---------- action helpers ----------
 const pad=n=>String(n).padStart(2,'0'),ics=d=>d.getUTCFullYear()+pad(d.getUTCMonth()+1)+pad(d.getUTCDate())+'T'+pad(d.getUTCHours())+pad(d.getUTCMinutes())+'00Z',esc2=s=>String(s).replace(/[\\;,]/g,'\\$&').replace(/\n/g,'\\n');
 function icsFile(title,when){const e=new Date(when.getTime()+36e5),body=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//LaunchRiot//EN','BEGIN:VEVENT','UID:lr'+Date.now()+'@launchriot.online','DTSTAMP:'+ics(new Date()),'DTSTART:'+ics(when),'DTEND:'+ics(e),'SUMMARY:'+esc2(title),'DESCRIPTION:'+esc2('Added from LaunchRiot (Dubai time)'),'END:VEVENT','END:VCALENDAR'].join('\r\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([body],{type:'text/calendar'}));a.download='meeting.ics';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
 const addTask=t=>{D.tasks.unshift({id:Date.now()+Math.random(),t,pri:0,done:0});save()};
 const first=n=>{const f=String(n||'').replace(/<.*$/,'').replace(/["']/g,'').trim().split(/\s+/)[0]||'';return /^[+\d]/.test(f)?'':f};
 function saveDraft(o){const L=LS('lr-wa-drafts',[]);L.unshift({id:'wd'+Date.now(),at:new Date().toISOString(),...o});SS('lr-wa-drafts',L.slice(0,200))}
 const chaserText=(name,subj)=>'Hi'+(first(name)?' '+first(name):'')+', just following up on my earlier message'+(subj?' about "'+String(subj).slice(0,60)+'"':'')+'. Could you let me know where this stands when you get a chance? Thank you.';
 const REM=()=>LS('lr-reminders',[]);
 function remAt(kind){const n=dubaiNow(),y=n.getUTCFullYear(),mo=n.getUTCMonth(),d=n.getUTCDate();if(kind==='1h')return new Date(Date.now()+36e5);if(kind==='tonight'){let w=mk(y,mo,d,20,0);if(w<new Date())w=new Date(Date.now()+36e5);return w}return mk(y,mo,d+1,9,0)}
 setInterval(()=>{const L=REM(),now=Date.now(),due=L.filter(r=>r.at<=now);if(due.length){SS('lr-reminders',L.filter(r=>r.at>now));due.forEach(r=>toast('Reminder: '+r.text))}},30000);
 const DONE=()=>new Set(LS('lr-done',[]));
 // ---------- chips ----------
 let reg={},tok=0;
 const reg1=f=>{const k='t'+(++tok);reg[k]=f;return k};
 window.saRun=k=>{const f=reg[k];if(f)f()};
 const btn=(label,f)=>'<button type="button" onclick="saRun(\''+reg1(f)+'\')">'+E(label)+'</button>';
 const waLink=v=>'https://wa.me/'+String(v).replace(/\D/g,'').replace(/^00/,'');
 function chips(ctx){const r=analyze(ctx.text),h=[];const isMail=ctx.kind==='mail',nm=ctx.name,sj=ctx.subject||(ctx.text||'').slice(0,50);
  r.acts.forEach(a=>{const k=a.k,tag=a.custom?' (your rule: '+a.custom+')':'';
   if(k==='calendar'){const w=a.when;h.push(btn('Add to calendar · '+fmtWhen(w.when)+(w.guessed?' (set time)':''),()=>{icsFile(ctx.subject||('Meeting with '+(nm||'contact')),w.when);toast('Calendar file downloaded (Dubai time). Open it to add the event.')}));
    h.push(btn('Draft a confirmation',()=>{saveDraft({kind:isMail?'email':'wa',chat_id:isMail?'':ctx.id,account:ctx.account||'',name:nm||'',text:'Hi'+(first(nm)?' '+first(nm):'')+', thank you. I confirm our meeting on '+fmtWhen(w.when)+' (Dubai time). Please let me know if anything changes.'});toast('Confirmation saved as a draft. Nothing was sent.')}))}
   if(k==='finance'){h.push(btn('Add to finance follow-up',()=>{addTask('Finance follow-up: '+(nm?nm+' – ':'')+sj);toast('Added to Tasks')}));if(isMail){h.push(btn('Mark as supplier',()=>mvFolder(ctx.id,'Suppliers')));h.push(btn('Mark as client',()=>mvFolder(ctx.id,'Clients')))}}
   if(k==='urgent'){if(isMail)h.push(btn('Mark priority',()=>mvFolder(ctx.id,'Priority')));[['1h','Remind me in 1h'],['tonight','Remind me tonight'],['tomorrow','Remind me tomorrow 9am']].forEach(([x,l])=>h.push(btn(l,()=>{const at=remAt(x),L=REM();L.push({at:at.getTime(),text:sj});SS('lr-reminders',L);addTask('Reminder ('+fmtWhen(at)+'): '+sj);toast('Reminder set for '+fmtWhen(at)+' (Dubai). It shows while this page is open, and is on your Tasks.')})))}
   if(k==='waiting')h.push(btn('Add to waiting-for / to-do',()=>{addTask('Waiting for: '+(nm?nm+' – ':'')+sj);toast('Added to Tasks')}));
   if(k==='guest')h.push(btn('Open guest card',()=>guestCard(ctx)));
   if(k==='done'&&isMail)h.push(btn('Archive / mark done',()=>{const s=DONE();s.add(ctx.id);SS('lr-done',[...s]);const o=document.getElementById('rd-ov');if(o)o.remove();toast('Archived locally. Restore from the Inbox page.');render()}));
   if(k==='chaser')h.push(btn('Draft a chaser',()=>{saveDraft({kind:isMail?'email':'wa',chat_id:isMail?'':ctx.id,account:ctx.account||'',name:nm||'',text:chaserText(nm,ctx.subject)});toast('Chaser saved as a draft. Nothing was sent.')}))});
  r.contacts.forEach(c=>{if(c.type==='phone'){h.push(btn('Copy '+c.v,()=>cp(c.v)));h.push('<a href="tel:'+E(c.v.replace(/[^\d+]/g,''))+'">Call</a>');h.push('<a target="_blank" rel="noopener noreferrer" href="'+E(waLink(c.v))+'">Open WhatsApp chat</a>')}
   else if(c.type==='address'){h.push(btn('Copy address',()=>cp(c.v)));h.push('<a target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(c.v)+'">Open in Maps</a>')}
   else{h.push(btn('Copy link',()=>cp(c.v)));h.push('<a target="_blank" rel="noopener noreferrer nofollow" href="'+E(c.v)+'">Open link</a>')}});
  if(!h.length)return '';return '<div class="sa"><span class="lbl">Smart actions · nothing is sent</span>'+h.join('')+'</div>'}
 function cp(v){(navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(v):Promise.reject()).then(()=>toast('Copied')).catch(()=>toast('Select and copy it manually'))}
 function guestCard(ctx){const G=LS('lr-guests',{}),k=ctx.key||ctx.id,g=G[k]||{notes:''};const o=document.createElement('div');o.id='sa-ov';o.onclick=e=>{if(e.target===o)o.remove()};
  o.innerHTML='<div id="sa-box"><h3 style="margin:0 0 6px">Guest card</h3><div><b>'+E(ctx.name||'(guest)')+'</b> <span class="sa-b">Guest</span></div><div class="muted" style="font-size:12px;margin:4px 0">'+E(ctx.kind==='mail'?'From email':'From WhatsApp')+(ctx.subject?' · '+E(ctx.subject):'')+'</div><label class="muted">Notes (saved in this browser)<textarea id="sa-gn" rows="4">'+E(g.notes)+'</textarea></label><div class="toolbar" style="margin-top:8px"><button class="btn sm" id="sa-gs">Save</button><button class="btn sm dark" id="sa-gc">Close</button></div></div>';
  document.body.appendChild(o);o.querySelector('#sa-gc').onclick=()=>o.remove();o.querySelector('#sa-gs').onclick=()=>{G[k]={name:ctx.name||'',tag:'Guest',notes:o.querySelector('#sa-gn').value,at:Date.now()};SS('lr-guests',G);o.remove();toast('Guest card saved')}}
 // ---- reader (email) ----
 let lastMid=null;document.addEventListener('click',e=>{const c=e.target.closest&&e.target.closest('.card.mail[data-mid]');if(c)lastMid=c.getAttribute('data-mid')},true);
 new MutationObserver(()=>{const b=document.getElementById('rd-box');if(!b||b.querySelector('#rd-sa'))return;const body=b.querySelector('.rd-body');if(!body)return;const m=D.mail.find(x=>String(x.id)===String(lastMid));if(!m)return;
  const h=chips({kind:'mail',id:m.id,name:String(m.from||'').replace(/<.*$/,'').trim()||m.from,subject:m.subj,text:(m.subj||'')+'\n'+body.innerText,account:m.account,key:(typeof fromEmail==='function'?fromEmail(m):m.id)});
  const d=document.createElement('div');d.id='rd-sa';d.innerHTML=h;body.insertAdjacentElement('afterend',d)}).observe(document.body,{childList:true,subtree:true});
 // ---- list badges ----
 if(typeof mailRow==='function'){const _mr=mailRow;mailRow=function(m){const h=_mr(m);let r;try{r=analyze((m.subj||'')+'\n'+(m.sum||''))}catch(e){return h}
  const b=r.acts.map(a=>'<span class="sa-b">'+E(BADGE[a.k])+'</span>').concat(r.contacts.length?['<span class="sa-b">Contact</span>']:[]).join('');return b?h.replace(/<\/div>\s*$/,'<div>'+b+'</div></div>'):h}}
 // ---- WhatsApp reader ----
 window.__saPaint=(chat,msgs)=>{const card=document.querySelector('#wa-read .card');if(!card||!chat||!msgs)return;const old=card.querySelector('#wa-sa');if(old)old.remove();
  const inc=msgs.filter(x=>!x.from_me&&x.text).slice(-5).map(x=>x.text).join('\n');const h=chips({kind:'wa',id:chat.id,name:chat.name,account:chat.account,text:inc});
  if(h){const d=document.createElement('div');d.id='wa-sa';d.innerHTML=h;const ms=card.querySelector('.wa-msgs');ms?ms.insertAdjacentElement('afterend',d):card.appendChild(d)}};
 // ================= Job 2 =================
 const biz=()=>String(LS('lr-biz','')||'');
 window.bizSave=()=>{const v=(document.getElementById('biz-t').value||'').trim();if(v.length<3){toast('Write a few words about your business');return}SS('lr-biz',v);toast('Saved in this browser');render()};
 function checklist(){const waOk=API.status.some(c=>/^whatsapp$/i.test(c.provider||'')&&(c.accounts||[]).some(a=>a.state==='connected'));
  const st=[[isCon('google')||isCon('microsoft')||isCon('zoho'),'Connect your email','Connect Gmail (or Outlook / Zoho) on the Connections page.','connections'],[waOk,'Connect WhatsApp','Link WhatsApp Business (or Personal) on the Connections page.','connections'],[biz().length>=3,'Tell us what your business does','',null]];
  if(!API.authed||st.every(s=>s[0]))return '';const n=st.filter(s=>s[0]).length;
  return '<div class="card vivid" style="margin-bottom:14px"><h3>Get started · '+n+' of 3 done</h3><div class="bar" style="margin:8px 0"><i style="width:'+Math.round(n/3*100)+'%"></i></div>'+st.map(s=>'<div class="ck '+(s[0]?'ok':'')+'"><i>'+(s[0]?'✓':'')+'</i><div><b>'+E(s[1])+'</b>'+(s[0]?'':(s[3]?'<div class="muted">'+E(s[2])+' <a href="#/app/'+s[3]+'">Open</a></div>':'<div><textarea id="biz-t" rows="2" placeholder="e.g. I manage holiday homes in Dubai">'+E(biz())+'</textarea><button class="btn sm" style="margin-top:6px" onclick="bizSave()">Save</button></div>'))+'</div></div>').join('')+'<p class="muted" style="margin:6px 0 0">Ticks automatically once connected. This card disappears when all three are done.</p></div>'}
 // waiting on others (WhatsApp fallback: the mail API exposes no sent mail / is_from_me field)
 const WT={list:null,at:0,busy:false,err:''};
 async function loadWait(){if(!waOn()||WT.busy||Date.now()-WT.at<600000)return;WT.busy=true;WT.at=Date.now();
  try{const r=await api('/whatsapp/chats?limit=100'),cs=(Array.isArray(r)?r:(r&&r.chats)||[]),now=Date.now();
   const cand=cs.filter(c=>!c.is_group&&!(c.unread>0)&&c.last_at&&now-new Date(c.last_at)>2*864e5&&now-new Date(c.last_at)<45*864e5).sort((a,b)=>new Date(b.last_at)-new Date(a.last_at)).slice(0,12);
   const res=await Promise.all(cand.map(c=>api('/whatsapp/chats/'+encodeURIComponent(c.id)+'/messages?limit=3').then(m=>{m=Array.isArray(m)?m:(m&&m.messages)||[];const l=m[m.length-1];return l&&l.from_me?c:null}).catch(()=>null)));
   WT.list=res.filter(Boolean);WT.err=''}catch(e){WT.err='Could not check WhatsApp ('+(e.status||'offline')+').'}
  WT.busy=false;paintWait()}
 const wBody=()=>WT.err&&!WT.list?'<p style="color:#b00">'+E(WT.err)+'</p>':!WT.list?'<p class="muted">Checking…</p>':!WT.list.length?'<p class="muted">Nothing waiting. No chats where your message went unanswered for 2+ days.</p>':WT.list.map(c=>'<div class="dw" style="display:flex;gap:10px;padding:8px 0;border-top:1px solid #e3e5ea"><div style="flex:1;min-width:0"><b>'+E(c.name||'(unknown)')+'</b><div class="muted" style="font-size:12px">You wrote last · '+Math.floor((Date.now()-new Date(c.last_at))/864e5)+' days ago</div></div><button class="btn sm" onclick="chaseW(\''+E(c.id)+'\')">Draft a chaser</button></div>').join('');
 function paintWait(){const b=document.getElementById('wt-body');if(b)b.innerHTML=wBody()}
 window.chaseW=id=>{const c=(WT.list||[]).find(x=>String(x.id)===String(id));if(!c)return;saveDraft({kind:'wa',chat_id:c.id,account:c.account||'',name:c.name||'',text:chaserText(c.name,'')});toast('Chaser saved on the Drafts page. Nothing was sent.')};
 const waitCard=()=>waOn()?'<div class="card vivid" style="margin-bottom:14px"><h3>Waiting on others</h3><p class="muted" style="margin:0">WhatsApp chats where you wrote last and got no reply for 2+ days. (Sent email isn’t available from the mail connection yet.) Chasers are drafts only.</p><div id="wt-body">'+wBody()+'</div></div>':'';
 // ---------- trust ----------
 const trustView=()=>'<h2>Trust &amp; privacy</h2><div class="two"><div class="card vivid"><h3>What LaunchRiot reads</h3><ul><li>Your connected Gmail: sender, subject and message text, so it can sort and show your mail.</li><li>Your Google Calendar: meeting titles and times.</li><li>Your linked WhatsApp chats: read-only.</li></ul><p class="muted">It does not read other apps, and it never changes or deletes anything in your mail or WhatsApp.</p></div>'
  +'<div class="card vivid"><h3>Nothing is sent without approval</h3><p>LaunchRiot only writes drafts. There is no send button for mail or WhatsApp. You copy a draft and send it yourself.</p></div></div>'
  +'<div class="card vivid" style="margin-top:14px"><h3>How to disconnect</h3><ul><li><b>Google:</b> remove LaunchRiot at <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">myaccount.google.com/permissions</a>.</li><li><b>WhatsApp:</b> on your phone open WhatsApp, Settings, Linked devices, tap this device and log out.</li><li><b>This browser:</b> use “Clear all data” at the top of any page, or <a href="#" onclick="logout();return false">sign out</a>.</li></ul><p class="muted">Your folder choices, drafts and notes are kept in this browser only.</p></div>';
 // ---------- settings card ----------
 window.saAddRule=()=>{const w=(document.getElementById('sa-w').value||'').trim(),a=document.getElementById('sa-a').value;if(!w||!ACT_IDS.includes(a)){toast('Enter a word and choose an action');return}const L=customRules();L.push({word:w,action:a});SS('lr-sa-rules',L);toast('Rule saved');render()};
 window.saDelRule=i=>{const L=customRules();L.splice(i,1);SS('lr-sa-rules',L);render()};
 const settingsCard=()=>'<div class="card vivid" style="margin-bottom:14px"><h3>Smart actions</h3><p class="muted">Words in an email or WhatsApp message trigger one-tap action chips. Nothing is ever sent.</p><table style="width:100%"><tbody>'+ACT_IDS.map(k=>'<tr><td style="vertical-align:top;padding:2px 8px 2px 0"><b>'+E(DEF[k].label)+'</b></td><td class="muted">'+DEF[k].words.map(E).join(', ')+'</td></tr>').join('')+'<tr><td><b>Contact details</b></td><td class="muted">phone numbers, addresses, links</td></tr></tbody></table><h4>Your own rules</h4>'+(customRules().map((r,i)=>'<div class="toolbar"><span>“'+E(r.word)+'” → '+E(DEF[r.action].label)+'</span><button class="btn sm dark" onclick="saDelRule('+i+')">Remove</button></div>').join('')||'<p class="muted">None yet.</p>')+'<div class="toolbar" style="margin-top:8px"><input class="in" id="sa-w" placeholder="Word or phrase" style="max-width:220px"><select id="sa-a">'+ACT_IDS.map(k=>'<option value="'+k+'">'+E(DEF[k].label)+'</option>').join('')+'</select><button class="btn sm" onclick="saAddRule()">Add rule</button></div></div>';
 // ---------- hooks ----------
 const _v=view;
 view=function(t){
  if(t==='trust')return trustView();
  let all=null;if(t==='inbox'||t==='dashboard'){const s=DONE();if(s.size){all=D.mail;D.mail=all.filter(m=>!s.has(m.id))}}
  let h;try{h=_v(t)}finally{if(all)D.mail=all}
  if(typeof h!=='string')return h;
  if(t==='dashboard'){const c=checklist()+waitCard();if(c)h=h.includes('</section>')?h.replace('</section>',()=>'</section>'+c):c+h}
  if(t==='inbox'&&DONE().size)h+='<p class="muted"><a href="#" onclick="saRestore();return false">'+DONE().size+' archived locally · Restore all</a></p>';
  if(t==='settings')h=h.replace('<button class="btn big" onclick="saveSettings()">',()=>settingsCard()+'<button class="btn big" onclick="saveSettings()">');
  return h};
 window.saRestore=()=>{SS('lr-done',[]);render()};
 const _r=render;render=function(){_r();if(document.getElementById('wt-body'))loadWait()};
 setInterval(()=>{if(document.getElementById('wt-body')&&!document.hidden)loadWait()},650000);
 window.__sa={analyze,parseWhen};
 render();
})();
