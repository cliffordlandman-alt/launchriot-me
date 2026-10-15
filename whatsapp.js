// WhatsApp (read-only) for LaunchRiot workspaces. Only active when /status lists provider 'whatsapp'.
// Safe in the shared template: does nothing otherwise. No send. All server content is escaped, plain text only.
(function(){
 if(typeof API==='undefined'||typeof api!=='function'||typeof view!=='function'||typeof render!=='function')return;
 const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const ORDER=['business','personal'],LABEL={business:'WhatsApp Business',personal:'WhatsApp Personal (on request)'};
 const S={accts:null,chats:null,filter:'all',open:null,msgs:null,msgErr:'',chatErr:'',link:{},timers:{},list:null};
 const active=()=>!!(API.authed&&API.status.some(c=>/^whatsapp$/i.test(c.provider||'')));
 const css=document.createElement('style');css.textContent='.wa-note{font-size:13px;background:#eef9f3;border-radius:8px;padding:6px 10px;margin:8px 0;color:#101216}.wa-qr{width:230px;height:230px;background:#fff;padding:8px;border-radius:8px;display:block;margin:8px 0}.wa-chat{display:flex;gap:10px;align-items:center;padding:10px;border-radius:10px;cursor:pointer;border:1px solid #e3e5ea;margin-bottom:6px;background:#fff;color:#101216}.wa-chat.un{border-color:#83e7bb;background:#f2fbf6}.wa-chat b{display:block}.wa-chat .t{font-size:12px;color:#666;white-space:nowrap}.wa-chat .tx{font-size:13px;color:#555;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:48vw}.wa-badge{background:#25a35a;color:#fff;border-radius:10px;min-width:20px;text-align:center;padding:1px 6px;font-size:12px}.wa-msgs{display:flex;flex-direction:column;gap:6px;background:#f4f5f7;border-radius:10px;padding:10px;max-height:60vh;overflow:auto}.wa-m{max-width:78%;padding:6px 10px;border-radius:10px;background:#fff;color:#101216;white-space:pre-wrap;word-break:break-word;align-self:flex-start}.wa-m.me{align-self:flex-end;background:#d9fdd3}.wa-m small{display:block;color:#666;font-size:11px}';document.head.appendChild(css);
 const dt=iso=>{if(!iso)return'';const d=new Date(iso);if(isNaN(d))return'';const o={timeZone:'Asia/Dubai'},day=d.toLocaleDateString('en-CA',o),now=new Date().toLocaleDateString('en-CA',o);
  const hm=d.toLocaleTimeString('en-GB',{...o,hour:'2-digit',minute:'2-digit',hour12:false});return day===now?hm:d.toLocaleDateString('en-GB',{...o,day:'numeric',month:'short'})+' '+hm};
 const sname=a=>E(LABEL[a]||a);
 const sbadge={connected:['Connected','#25a35a'],qr:['Scan the QR','#b7791f'],connecting:['Connecting…','#b7791f'],error:['Error','#b00'],not_linked:['Not linked','#666']};
 const badge=s=>{const b=sbadge[s]||[s||'Unknown','#666'];return '<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;color:#fff;background:'+b[1]+'">'+E(b[0])+'</span>'};
 const fallback='<div class="toolbar" style="margin-top:8px"><span class="muted">Or use WhatsApp Web directly:</span><a class="btn sm" href="https://web.whatsapp.com" target="_blank" rel="noopener noreferrer">Open WhatsApp Web (Personal)</a><a class="btn sm" href="https://web.whatsapp.com" target="_blank" rel="noopener noreferrer">Open WhatsApp Web (Business)</a></div>';
 const NOTE='<div class="wa-note"><b>Read-only.</b> Messages are read from your linked WhatsApp. Replies are drafts for now.</div>';
 const acctState=a=>{const l=S.link[a];if(l&&l.st&&l.st.state)return l.st.state;const x=(S.accts||[]).find(y=>y.account===a);if(x)return x.state;const p=API.status.find(c=>/^whatsapp$/i.test(c.provider||''));const y=p&&(p.accounts||[]).find(z=>z.account===a||z.email===a);return y?(y.state||'not_linked'):'not_linked'};
 function cardFor(a){const s=acctState(a),l=S.link[a]||{},st=l.st||{},x=(S.accts||[]).find(y=>y.account===a)||{};let body='';
  if(s==='qr'&&st.qr_data_url&&/^data:image\//.test(st.qr_data_url))body='<img class="wa-qr" alt="WhatsApp link QR code" src="'+E(st.qr_data_url)+'"><ol class="muted" style="padding-left:18px;margin:4px 0"><li>On your phone open WhatsApp</li><li>Go to Settings &gt; Linked devices &gt; Link a device</li><li>Scan this QR code</li></ol>';
  else if(s==='connecting')body='<p class="muted">Connecting… this can take a moment.</p>';
  else if(s==='connected')body='<div class="muted">'+(x.phone?E(x.phone)+' · ':'')+'Last seen: '+(typeof ago==='function'?E(ago(x.last_seen)):'')+'</div>';
  const err=st.error||l.err||(x.state==='error'?x.error:'');
  const expired=l.started&&s==='not_linked'&&!l.busy;
  let btn='';if(s==='connected')btn='';else if(s==='qr'||s==='connecting'||l.busy)btn='';else btn='<button class="btn sm" onclick="waLink(\''+a+'\')">'+(expired?'Get a new QR':'Link WhatsApp')+'</button>';
  return '<div class="card" style="margin-top:8px" data-wa="'+a+'"><b>'+sname(a)+'</b> '+badge(l.busy&&s==='not_linked'?'connecting':s)+(expired?'<p class="muted">The QR expired before it was scanned.</p>':'')+(err?'<p style="color:#b00">'+E(err)+'</p>':'')+body+(btn?'<div class="toolbar" style="margin-top:8px">'+btn+'</div>':'')+'</div>'};
 const cardsHtml=()=>ORDER.map(cardFor).join('');
 const paintCards=()=>{const el=document.getElementById('wa-cards');if(el)el.innerHTML=cardsHtml()};
 window.waLink=async a=>{if(a==='personal'&&!confirm('Link your Personal WhatsApp? This is only done on request.'))return;
  const l=S.link[a]=S.link[a]||{};l.busy=true;l.err='';l.started=true;l.tries=0;paintCards();
  try{l.st=await api('/whatsapp/link',{method:'POST',body:JSON.stringify({account:a})})}catch(e){l.busy=false;l.err='Could not start linking ('+(e.status||'offline')+'). Please try again.';paintCards();return}
  l.busy=false;paintCards();poll(a)};
 function poll(a){clearTimeout(S.timers[a]);const l=S.link[a];if(!l)return;
  S.timers[a]=setTimeout(async()=>{if(!document.getElementById('wa-cards')&&!document.getElementById('wa-list')){return}
   try{l.st=await api('/whatsapp/link/'+encodeURIComponent(a));l.err=''}catch(e){l.err='Status check failed ('+(e.status||'offline')+')'}
   l.tries=(l.tries||0)+1;paintCards();const s=l.st&&l.st.state;
   if(s==='connected'){loadAccts();return}
   if(s==='error'||s==='not_linked'&&l.tries>1||l.tries>120)return;
   poll(a)},2500)}
 async function loadAccts(){try{const r=await api('/whatsapp/accounts');S.accts=Array.isArray(r)?r:(r&&r.accounts)||[];S.accts.forEach(x=>{if((x.state==='qr'||x.state==='connecting')&&!S.link[x.account]){S.link[x.account]={started:true,tries:0};poll(x.account)}});paintCards()}catch(e){}}
 // ---- chats ----
 const sortChats=c=>c.slice().sort((a,b)=>(b.unread>0)-(a.unread>0)||new Date(b.last_at||0)-new Date(a.last_at||0));
 async function loadChats(){const el=document.getElementById('wa-list');if(!el)return;
  try{const q=S.filter==='all'?'':'account='+S.filter+'&';const r=await api('/whatsapp/chats?'+q+'limit=100');S.chats=Array.isArray(r)?r:(r&&r.chats)||[];S.chatErr=''}catch(e){S.chatErr='Could not load chats ('+(e.status||'offline')+').'}
  paintList();if(S.open)loadMsgs(true)}
 function paintList(){const el=document.getElementById('wa-list');if(!el)return;
  if(S.chatErr&&!S.chats){el.innerHTML='<p style="color:#b00">'+E(S.chatErr)+'</p>';return}
  const L=sortChats(S.chats||[]);
  el.innerHTML=(S.chatErr?'<p style="color:#b00">'+E(S.chatErr)+'</p>':'')+(L.length?L.map(c=>'<div class="wa-chat'+(c.unread>0?' un':'')+'" tabindex="0" role="button" data-cid="'+E(c.id)+'"><div style="flex:1;min-width:0"><b>'+E(c.name||'(unknown)')+(c.is_group?' <span class="muted">· group</span>':'')+'</b><div class="tx">'+E(c.last_text||'')+'</div><span class="muted" style="font-size:11px">'+E(c.account||'')+'</span></div><div style="text-align:right"><div class="t">'+E(dt(c.last_at))+'</div>'+(c.unread>0?'<span class="wa-badge">'+E(c.unread)+'</span>':'')+'</div></div>').join(''):'<p class="muted">No chats to show yet. Once a WhatsApp account is linked and has messages, they appear here.</p>')}
 async function loadMsgs(quiet){if(!S.open)return;const id=S.open.id;if(!quiet){S.msgs=null;S.msgErr='';paintMsgs()}
  try{const r=await api('/whatsapp/chats/'+encodeURIComponent(id)+'/messages?limit=100');if(!S.open||S.open.id!==id)return;S.msgs=Array.isArray(r)?r:(r&&r.messages)||[];S.msgErr=''}catch(e){if(!S.open||S.open.id!==id)return;S.msgErr='Could not load messages ('+(e.status||'offline')+').'}
  paintMsgs()}
 function paintMsgs(){const el=document.getElementById('wa-read');if(!el)return;
  if(document.activeElement&&document.activeElement.id==='wa-dt'&&S.open)return;
  if(!S.open){el.innerHTML='';return}
  const m=S.msgs;el.innerHTML='<div class="card" style="margin-top:10px"><div class="toolbar"><button class="btn sm dark" onclick="waBack()">← Back to chats</button><b>'+E(S.open.name||'')+'</b></div>'+(S.msgErr?'<p style="color:#b00">'+E(S.msgErr)+'</p>':'')+(m===null&&!S.msgErr?'<p class="muted">Loading…</p>':'<div class="wa-msgs" id="wa-msgs">'+((m||[]).length?m.map(x=>'<div class="wa-m'+(x.from_me?' me':'')+'">'+(x.from_me?'':(x.sender?'<small>'+E(x.sender)+'</small>':''))+E(x.text||'')+'<small>'+E(dt(x.at))+' (Dubai)</small></div>').join(''):'<span class="muted">No messages.</span>')+'</div>')+draftUi()+'<p class="muted" style="margin-top:8px">Read-only. There is no send button; replies are drafts for now.</p></div>';
  const b=document.getElementById('wa-msgs');if(b)b.scrollTop=b.scrollHeight;
  if(window.__saPaint&&S.open&&S.msgs)try{window.__saPaint(S.open,S.msgs)}catch(e){}
  const l=document.getElementById('wa-list');if(l)l.style.display='none'}
 window.waBack=()=>{S.draftOpen=false;S.open=null;S.msgs=null;paintMsgs();const l=document.getElementById('wa-list');if(l)l.style.display=''};
 window.waFilter=f=>{S.filter=f;S.chats=null;S.open=null;render()};
 document.addEventListener('click',e=>{const c=e.target.closest&&e.target.closest('.wa-chat[data-cid]');if(!c)return;const x=(S.chats||[]).find(y=>String(y.id)===c.getAttribute('data-cid'));if(x){S.draftOpen=false;S.open=x;loadMsgs()}});
 document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches&&e.target.matches('.wa-chat[data-cid]'))e.target.click()});
 
// ---- drafts (local only, never sent) ----
const DK='lr-wa-drafts';
const draftsAll=()=>{try{return JSON.parse(localStorage.getItem(DK)||'[]')}catch(e){return[]}};
function suggest(msgs,chat){const inc=(msgs||[]).filter(x=>!x.from_me&&x.text);const last=inc.slice(-3);const txt=last.map(x=>x.text).join(' ').toLowerCase();
 const who=chat&&!chat.is_group&&chat.name&&!/^[+\d\s()-]+$/.test(chat.name)?String(chat.name).trim().split(/\s+/)[0]:'';
 let r='Hi'+(who?' '+who:'')+', thank you for your message. ';
 if(!last.length)return r+'How can I help?';
 const q=/\?/.test(txt)||/\b(can you|could you|do you|are you|when|where|how much|how many|what)\b/.test(txt);
 const price=/\b(price|quote|quotation|cost|how much|rate|estimate|invoice|payment|pay)\b/.test(txt);
 const when=/\b(today|tomorrow|tonight|asap|urgent|schedule|appointment|available|availability|time|visit)\b/.test(txt);
 const pic=/\b(photo|picture|pic|image|video|document|attach)\b/.test(txt);
 if(price)r+='I will check the details and come back to you with the figures shortly. ';
 else if(when)r+='Let me check my diary and confirm a time with you. ';
 else if(q)r+='I will look into this and get back to you. ';
 else r+='I have noted it. ';
 const need=[];if(price||q)need.push('the quantity or scope');if(when)need.push('your preferred date and time');if(price||when)need.push('the location');if(pic)need.push('a photo or document if you have one');
 if(need.length)r+='Could you please share '+need.slice(0,3).join(', ').replace(/, ([^,]*)$/,' and $1')+'? ';
 return (r+'Thank you.').replace(/\s+/g,' ').trim()}
function draftUi(){if(!S.draftOpen)return '<div class="toolbar" style="margin-top:8px"><button class="btn sm" onclick="waDraftOpen()">Draft a reply</button><span class="muted">Draft only, not sent.</span></div>';
 return '<div class="wa-note" style="margin-top:8px"><b>Draft only, not sent.</b> A suggested reply from the last messages. Edit it, then save it to your Drafts page. Nothing is sent from LaunchRiot.</div><textarea id="wa-dt" rows="4" oninput="waDT(this.value)">'+E(S.draftText||'')+'</textarea><div class="toolbar" style="margin-top:8px"><button class="btn sm" onclick="waDraftSave()">Save draft</button><button class="btn sm dark" onclick="waDraftCancel()">Discard</button></div>'}
window.waDraftOpen=()=>{S.draftText=suggest(S.msgs,S.open);S.draftOpen=true;S.msgs&&paintMsgs()};
window.waDT=v=>{S.draftText=v};
window.waDraftCancel=()=>{S.draftOpen=false;paintMsgs()};
window.waDraftSave=()=>{const t=String(S.draftText||'').trim();if(!t||!S.open)return;const L=draftsAll();
 L.unshift({id:'wd'+Date.now(),chat_id:S.open.id,account:S.open.account||'',name:S.open.name||'',text:t,at:new Date().toISOString()});
 try{localStorage.setItem(DK,JSON.stringify(L.slice(0,200)))}catch(e){}
 S.draftOpen=false;paintMsgs();if(typeof toast==='function')toast('Draft saved on the Drafts page. Nothing was sent.')};
window.__wa={open:c=>{S.draftOpen=false;S.open=c;S.msgs=null;if(location.hash==='#/app/whatsapp')render();else location.hash='#/app/whatsapp'}};
// ---- hooks ----
 const _view=view;
 view=function(t){const h=_view(t);if(!active())return h;
  if(t==='connections'&&typeof h==='string'){const re=/<div class="card vivid" style="grid-column:1\/-1"><b>WhatsApp<\/b>[\s\S]*?Open WhatsApp Web \(Business\)<\/a><\/div><\/div>/;
   if(re.test(h))return h.replace(re,()=>'<div class="card vivid" style="grid-column:1/-1"><b>WhatsApp</b>'+NOTE+'<div id="wa-cards">'+cardsHtml()+'</div>'+fallback+'</div>');return h}
  if(t==='whatsapp'){const tabs=['all'].concat(ORDER);return '<h2>WhatsApp</h2>'+NOTE+'<div class="toolbar">'+tabs.map(f=>'<button class="btn sm'+(S.filter===f?'':' dark')+'" onclick="waFilter(\''+f+'\')">'+(f==='all'?'All':f[0].toUpperCase()+f.slice(1))+'</button>').join('')+'</div><div id="wa-read"></div><div id="wa-list" style="margin-top:8px"><p class="muted">Loading chats…</p></div>'+fallback}
  return h};
 const _render=render;
 render=function(){_render();if(!active())return;
  if(document.getElementById('wa-cards')){loadAccts();ORDER.forEach(a=>{const l=S.link[a];if(l&&l.st&&(l.st.state==='qr'||l.st.state==='connecting'))poll(a)})}
  if(document.getElementById('wa-list')){if(S.chats)paintList();paintMsgs();loadChats();clearInterval(S.list);S.list=setInterval(()=>{if(document.getElementById('wa-list')&&!document.hidden)loadChats();else clearInterval(S.list)},30000)}};
 if(active())render();
 // pick up activation once /status has loaded
 let was=active();setInterval(()=>{const n=active();if(n&&!was)render();was=n},1500);
})();
