// Dashboard WhatsApp card, Drafts page, About page, Inbox folders. Local only; nothing is ever sent.
(function(){
 if(typeof view!=='function'||typeof render!=='function'||typeof TABS==='undefined')return;
 const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const waOn=()=>!!(API.authed&&API.status.some(c=>/^whatsapp$/i.test(c.provider||'')));
 const hm=iso=>{if(!iso)return'';const d=new Date(iso);if(isNaN(d))return'';const o={timeZone:'Asia/Dubai'},same=d.toLocaleDateString('en-CA',o)===new Date().toLocaleDateString('en-CA',o),t=d.toLocaleTimeString('en-GB',{...o,hour:'2-digit',minute:'2-digit',hour12:false});return same?t+' (Dubai)':d.toLocaleDateString('en-GB',{...o,day:'numeric',month:'short'})+' '+t+' (Dubai)'};
 const css=document.createElement('style');css.textContent='.fl-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}.fl-tabs a{padding:5px 12px;border-radius:16px;border:1px solid #3a3f48;color:inherit;text-decoration:none;font-size:13px}.fl-tabs a.on{background:#83e7bb;color:#101216;border-color:#83e7bb}.fl-tabs a b{margin-left:4px}.mv{margin-top:8px;font-size:12px}.mv select{font-size:12px;padding:3px;border-radius:6px}.ab li{margin:4px 0}.dw{display:flex;gap:10px;padding:8px 0;border-top:1px solid #e3e5ea;cursor:pointer}.dw div.x{flex:1;min-width:0}.dw .tx{font-size:13px;opacity:.8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}';document.head.appendChild(css);
 // ---------- tabs ----------
 const iD=TABS.findIndex(t=>t[0]==='dashboard');
 TABS.splice(iD+1,0,['drafts','Drafts','MAS']);
 TABS.splice(TABS.findIndex(t=>t[0]==='connections'),0,['about','What LaunchRiot does','MAS']);
 // ---------- dashboard WhatsApp ----------
 const W={chats:null,at:0,err:'',busy:false};
 async function loadW(){if(!waOn()||W.busy||Date.now()-W.at<60000)return;W.busy=true;W.at=Date.now();
  try{const r=await api('/whatsapp/chats?unread=1&limit=50');W.chats=(Array.isArray(r)?r:(r&&r.chats)||[]).filter(c=>c.unread>0).sort((a,b)=>new Date(b.last_at||0)-new Date(a.last_at||0));W.err=''}catch(e){W.err='Could not load WhatsApp ('+(e.status||'offline')+').'}
  W.busy=false;paintW()}
 function wBody(){if(W.err&&!W.chats)return '<p style="color:#b00">'+E(W.err)+'</p>';if(!W.chats)return '<p class="muted">Loading…</p>';
  if(!W.chats.length)return '<p class="muted">No unread chats. You are all caught up.</p>';
  return W.chats.slice(0,5).map(c=>'<div class="dw" tabindex="0" role="button" data-dwa="'+E(c.id)+'"><div class="x"><b>'+E(c.name||'(unknown)')+'</b><div class="tx">'+E(c.last_text||'')+'</div></div><div style="text-align:right;font-size:12px">'+E(hm(c.last_at))+'<br><span class="wa-badge" style="background:#25a35a;color:#fff;border-radius:10px;padding:1px 6px">'+E(c.unread)+'</span></div></div>').join('')+(W.chats.length>5?'<p><a href="#/app/whatsapp" class="muted">See all '+W.chats.length+' unread chats</a></p>':'')}
 function paintW(){const b=document.getElementById('dash-wa-body'),n=document.getElementById('dash-wa-n'),br=document.getElementById('dash-wa-brief');
  if(b)b.innerHTML=wBody();if(n)n.textContent=W.chats?W.chats.length:'…';
  if(br){if(W.chats){br.style.display='';br.innerHTML='<b>'+W.chats.length+'</b> unread WhatsApp chat'+(W.chats.length==1?'':'s')}else br.style.display='none'}}
 document.addEventListener('click',e=>{const c=e.target.closest&&e.target.closest('.dw[data-dwa]');if(!c)return;const x=(W.chats||[]).find(y=>String(y.id)===c.getAttribute('data-dwa'));if(x&&window.__wa)window.__wa.open(x)});
 document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches&&e.target.matches('.dw[data-dwa]'))e.target.click()});
 // ---------- folders ----------
 const FK='lr-folders-v1',FOLDERS=['Priority','Clients','Suppliers','Subscriptions','Receipts & Payments','Notifications','Other'];
 const ov=()=>{try{return JSON.parse(localStorage.getItem(FK)||'{}')}catch(e){return{}}};
 const sender=m=>{try{return fromEmail(m)||String(m.from||'').toLowerCase()}catch(e){return String(m.from||'').toLowerCase()}};
 const RCPT=/(receipt|invoice|payment|payout|paid|order confirmation|your order|billing|statement|subscription renewal)/i;
 const SUBS=/(unsubscribe|newsletter|digest|special offer|% off|\bsale\b|promo|discount|\bdeals?\b|marketing|view (this )?(email )?in (your )?browser|manage (your )?(email )?preferences)/i;
 const SUPH=/\b(invoice|quote|quotation|order|delivery|supplier|purchase order|shipment|pricing)\b/i;
 const SYS_L=/(no[-_.]?reply|do[-_.]?not[-_.]?reply|donotreply|notifications?|alerts?|security|verification|mailer-daemon|postmaster|account-?protection)/i;
 const SYS_T=/(security alert|verification code|sign[- ]in|new login|password|one[- ]time|confirm your (email|account))/i;
 function folderOf(m){const o=ov()[sender(m)];if(o&&FOLDERS.includes(o))return o;
  let sc;try{sc=score(m).n}catch(e){sc=0}if(sc>=2)return 'Priority';
  const em=sender(m),loc=em.split('@')[0],dom=em.split('@')[1]||'',t=((m.subj||'')+' '+(m.sum||'')),sub=m.subj||'';let auto=false;try{auto=isAuto(m)}catch(e){}
  const noreply=/(no[-_.]?reply|do[-_.]?not[-_.]?reply|donotreply)/i.test(loc);
  if(/(^|\.)airbnb\.com$/.test(dom)){return /payout/i.test(sub)?'Receipts & Payments':'Clients'}   // guest and booking messages
  if(!auto&&!noreply&&SUPH.test(t))return 'Suppliers';
  if(/^\s*(re|fwd?)\s*:/i.test(sub)&&!noreply)return 'Clients';    // a person replying, even from a role address
  if(RCPT.test(sub)||/(billing|invoices?|receipts?|payments?)/.test(loc))return 'Receipts & Payments';
  if(auto||noreply){if(SUBS.test(t)||m.bulk||m.list_unsub)return 'Subscriptions';if(SYS_L.test(loc)||SYS_T.test(sub))return 'Notifications';return 'Subscriptions'}
  if(m.bulk||m.list_unsub)return 'Subscriptions';
  if(SUPH.test(t))return 'Suppliers';
  if(isDirect(m))return 'Clients';return 'Other'}
 const counts=()=>{const c={};FOLDERS.forEach(f=>c[f]=0);D.mail.forEach(m=>c[folderOf(m)]++);return c};
 let cur=localStorage.getItem('lr-folder-cur')||'All';
 const tabsHtml=()=>{const c=counts();return '<div class="fl-tabs"><a href="#" data-fl="All" class="'+(cur==='All'?'on':'')+'">All<b>'+D.mail.length+'</b></a>'+FOLDERS.map(f=>'<a href="#" data-fl="'+E(f)+'" class="'+(cur===f?'on':'')+'">'+E(f)+'<b>'+c[f]+'</b></a>').join('')+'</div>'};
 document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[data-fl]');if(!a)return;e.preventDefault();cur=a.getAttribute('data-fl');localStorage.setItem('lr-folder-cur',cur);render()});
 const opts=sel=>'<option value="">Move to folder…</option>'+FOLDERS.map(f=>'<option value="'+E(f)+'"'+(f===sel?' disabled':'')+'>'+E(f)+(f===sel?' (current)':'')+'</option>').join('');
 window.mvFolder=(id,f)=>{if(!f)return;const m=D.mail.find(x=>String(x.id)===String(id));if(!m)return;const o=ov(),k=sender(m);if(!k)return;o[k]=f;try{localStorage.setItem(FK,JSON.stringify(o))}catch(e){}
  toast('All mail from this sender now goes to '+f);render();const s=document.getElementById('rd-mv-sel');if(s)s.outerHTML=mvSel(m)};
 const mvSel=m=>'<select id="rd-mv-sel" onchange="mvFolder(\''+E(m.id)+'\',this.value)" aria-label="Move to folder">'+opts(folderOf(m))+'</select>';
 if(typeof mailRow==='function'){const _mr=mailRow;mailRow=function(m){const h=_mr(m);return h.replace(/<\/div>\s*$/,'<div class="mv muted" onclick="event.stopPropagation()">Folder: <b>'+E(folderOf(m))+'</b> · <select onchange="mvFolder(\''+E(m.id)+'\',this.value)" aria-label="Move to folder">'+opts(folderOf(m))+'</select></div></div>')}}
 // reading view: add folder menu
 let lastMid=null;document.addEventListener('click',e=>{const c=e.target.closest&&e.target.closest('.card.mail[data-mid]');if(c)lastMid=c.getAttribute('data-mid')},true);
 new MutationObserver(()=>{const b=document.getElementById('rd-box');if(!b||b.querySelector('#rd-mv'))return;const m=D.mail.find(x=>String(x.id)===String(lastMid));if(!m)return;const meta=b.querySelector('.rd-meta');if(!meta)return;
  const d=document.createElement('div');d.id='rd-mv';d.className='mv';d.innerHTML='<b>Folder:</b> '+E(folderOf(m))+' · '+mvSel(m);meta.appendChild(d)}).observe(document.body,{childList:true,subtree:true});
 // ---------- drafts page ----------
 const wd=()=>{try{return JSON.parse(localStorage.getItem('lr-wa-drafts')||'[]')}catch(e){return[]}};
 window.wdDel=id=>{localStorage.setItem('lr-wa-drafts',JSON.stringify(wd().filter(x=>x.id!==id)));render()};
 window.wdCopy=id=>{const x=wd().find(y=>y.id===id);if(!x)return;(navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(x.text):Promise.reject()).then(()=>toast('Copied. Paste it into WhatsApp yourself; nothing was sent.')).catch(()=>toast('Select the text and copy it manually'))};
 window.wdOpen=id=>{const x=wd().find(y=>y.id===id);if(x&&window.__wa)window.__wa.open({id:x.chat_id,name:x.name,account:x.account})};
 function draftsView(){const w=wd(),ap=D.approvals;
  return '<h2>Drafts</h2><p class="muted"><b>Draft only, not sent.</b> Nothing on this page is ever sent from LaunchRiot. Copy a draft and send it yourself, or approve it to hold it.</p>'
  +'<h3>Drafts written here <span class="muted">'+w.length+'</span></h3>'+(w.length?w.map(x=>'<div class="card" style="margin-bottom:10px"><span class="pill">'+(x.kind==='email'?'Email draft':'WhatsApp draft')+'</span> <span class="pill">Draft only, not sent</span><div class="muted" style="margin-top:6px">To: <b>'+E(x.name||'(chat)')+'</b>'+(x.account?' · '+E(x.account):'')+' · '+E(hm(x.at))+'</div><p style="white-space:pre-wrap">'+E(x.text)+'</p><div class="toolbar"><button class="btn sm" onclick="wdCopy(\''+E(x.id)+'\')">Copy</button>'+(x.chat_id?'<button class="btn sm dark" onclick="wdOpen(\''+E(x.id)+'\')">Open chat</button>':'')+'<button class="btn sm dark" onclick="wdDel(\''+E(x.id)+'\')">Delete</button></div></div>').join(''):'<p class="muted">No WhatsApp drafts yet. Open a chat on the WhatsApp page and tap “Draft a reply”.</p>')
  +'<h3>Email &amp; reminder drafts <span class="muted">'+ap.length+'</span></h3>'+(ap.length?apprTbl():'<p class="muted">No email or reminder drafts yet. Reminders you create on Staff tasks appear here for approval.</p>')}
 // ---------- about ----------
 function aboutView(){const L=[['One inbox','Both your Gmail accounts in one place, sorted into folders: Priority, Clients, Suppliers, Subscriptions, Receipts, Notifications.'],['Priority sorting','VIP senders, your keywords and mail that needs a reply rise to the top. Newsletters and automated mail stay out of the way.'],['WhatsApp reading and drafts','Your linked WhatsApp chats appear next to your mail, unread first. LaunchRiot suggests a polite reply as a draft. WhatsApp is read-only for now: you copy and send it yourself.'],['Morning brief','One summary each morning: meetings, priority mail, unread WhatsApp chats and approvals waiting.'],['Staff tasks that close themselves','When you are CC’d on a task email, it becomes a staff task. When the staff member replies, the task is marked done automatically.'],['Calendar and meeting reminders','See today’s meetings and plan next week. Reminders to your team, including by WhatsApp, are drafts for you to approve.'],['Drafts for approval','Every reply or reminder is a draft. Nothing is ever sent without your approval.'],['Free setup in 24 hours','We connect your accounts and set the workspace up for you within 24 hours, at no charge.']];
  return '<h2>What LaunchRiot does for you</h2><div class="card vivid ab"><img src="launchriot-logo.png" alt="LaunchRiot" style="height:44px;width:auto;background:#101216;padding:8px;border-radius:10px"><p>LaunchRiot gives you one place to run your day: your mail, your WhatsApp, your team’s follow-ups and your calendar, with assistants that draft and you who decide.</p></div><div class="two">'+L.map(x=>'<div class="card vivid"><h3>'+E(x[0])+'</h3><p>'+E(x[1])+'</p></div>').join('')+'</div><div class="card vivid" style="margin-top:14px"><h3>Pricing</h3><p><b>$199, $249 or $499 per month</b> (USD only), depending on your setup. Setup is free and done within 24 hours.</p><p class="muted">Honest notes: WhatsApp is read-only for now. Nothing is ever sent without your approval.</p></div>'}
 // ---------- view / render hooks ----------
 const _v=view;
 view=function(t){
  if(t==='drafts')return draftsView();
  if(t==='about')return aboutView();
  if(t==='inbox'){const h=_v(t);if(typeof h!=='string')return h;
   if(cur==='All')return h.replace('<h2>Inbox</h2>','<h2>Inbox</h2>'+tabsHtml());
   const L=D.mail.filter(m=>folderOf(m)===cur).sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')));
   return '<h2>Inbox</h2>'+tabsHtml()+'<p class="muted">Folder: <b>'+E(cur)+'</b>. Mail is sorted by simple local rules. Use “Move to folder” on any email to teach it where a sender belongs.</p>'+('<h3 class="sec-h">'+E(cur)+' <span>'+L.length+'</span></h3>')+(L.map(mailRow).join('')||'<p class="muted">Nothing in this folder.</p>')}
  const h=_v(t);
  if(t==='dashboard'&&typeof h==='string'){let card='<div class="card vivid" style="margin-bottom:14px"><h3>What LaunchRiot does for you</h3><p>One inbox with folders, WhatsApp reading and reply drafts, priority sorting, a morning brief, staff tasks that close themselves, and drafts for your approval. Nothing is sent without your approval. WhatsApp is read-only for now. <a href="#/app/about">See everything it does and the pricing →</a></p></div>';
   if(waOn())card='<div class="card vivid" style="margin-bottom:14px"><h3>WhatsApp · <span id="dash-wa-n">'+(W.chats?W.chats.length:'…')+'</span> unread chats</h3><div id="dash-wa-body">'+wBody()+'</div><p class="muted" style="margin:6px 0 0">Read-only · <a href="#/app/whatsapp">Open WhatsApp</a> · <a href="#/app/drafts">Drafts</a></p></div>'+card;
   let o=h;if(o.includes('<div class="tiles">'))o=o.replace('<div class="tiles">',()=>card+'<div class="tiles">');else o+=card;
   if(waOn())o=o.replace('<div class="brief2">',()=>'<div class="brief2"><span id="dash-wa-brief" style="'+(W.chats?'':'display:none')+'">'+(W.chats?'<b>'+W.chats.length+'</b> unread WhatsApp chat'+(W.chats.length==1?'':'s'):'')+'</span>');
   return o}
  return h};
 const _r=render;render=function(){_r();if(document.getElementById('dash-wa-body'))loadW()};
 setInterval(()=>{if(document.getElementById('dash-wa-body')&&!document.hidden)loadW()},65000);
 let was=waOn();setInterval(()=>{const n=waOn();if(n&&!was&&document.getElementById('main'))render();was=n},1500);
 render();
})();
