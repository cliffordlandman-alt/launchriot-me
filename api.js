// ===== Clifford's workspace ⇄ api-clifford (same contract as gareth-api) =====
// Auth is an HttpOnly session cookie: every request uses credentials:'include'. No token is stored in the browser.
const API_BASE='https://api-clifford.145-241-118-107.sslip.io';
const REFRESH_MS=5*60*1000;
const API={online:false,authed:false,loginLive:true,user:null,status:[],err:''};
const PROV={google:{n:'Google (Gmail & Calendar)',k:['gmail','gcal']}};
const ACCOUNTS=['clifford.landman1@gmail.com','clifford.landman@gmail.com'];
const KEY2PROV={gmail:'google',gcal:'google',outlook:'microsoft',zmail:'zoho',zcal:'zoho',zcrm:'zoho',zbooks:'zoho'};
const MAILSRC={google:'gmail',microsoft:'outlook',zoho:'zoho_mail'},UI_SRC={gmail:'gmail',outlook:'outlook',zoho_mail:'zmail'};
localStorage.removeItem('wh-api-token'); // drop any token stored by older builds
class ApiErr extends Error{constructor(s,b){super('HTTP '+s);this.status=s;this.body=b}}
async function api(path,opt={}){const h={...(opt.body?{'Content-Type':'application/json'}:{}),...(opt.headers||{})};
 const r=await fetch(API_BASE+path,{...opt,credentials:'include',headers:h});
 const ct=r.headers.get('content-type')||'',b=ct.includes('json')?await r.json().catch(()=>null):await r.text();
 if(r.status==401){if(API.authed){API.authed=false;render();showLogin()}throw new ApiErr(401,b)}
 if(!r.ok)throw new ApiErr(r.status,b);return b}
const arr=x=>Array.isArray(x)?x:(x&&(x.items||x.data||x.results||x.providers||x.drafts||x.tasks))||[];
const pick=(o,...k)=>{for(const x of k)if(o&&o[x]!=null&&o[x]!=='')return o[x];return ''};
const st=p=>API.status.find(c=>c.provider==p)||{};
const gAcct=em=>{em=String(em).toLowerCase();for(const p of API.status){if(p.provider!='google')continue;const a=(p.accounts||[]).find(x=>String(x.email||'').toLowerCase()==em);if(a)return a;if(!p.accounts&&String(p.email||'').toLowerCase()==em)return p}return {}};
const isCon=p=>(p=='google'&&API.status.some(x=>x.provider=='google'&&((x.accounts||[]).some(a=>a.state=='connected'))))||(st(p).state||st(p).status)=='connected';
function ago(t){if(!t)return 'never';const m=Math.round((Date.now()-new Date(t))/60000);return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':Math.round(m/1440)+' d ago'}
const dubai=iso=>{if(!iso)return{d:'',t:''};const x=new Date(iso),p=k=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dubai',...k}).format(x);return{d:p({year:'numeric',month:'2-digit',day:'2-digit'}),t:p({hour:'2-digit',minute:'2-digit',hour12:false})}};
// ---- login ----
function showLogin(note){let d=document.getElementById('wh-login');if(d){if(note)d.querySelector('#wh-lerr').textContent=note;return}d=document.createElement('div');d.id='wh-login';
 d.style.cssText='position:fixed;inset:0;z-index:60;background:rgba(11,16,32,.94);display:grid;place-items:center;padding:16px';
 d.innerHTML=`<form style="background:#fff;border-radius:18px;padding:24px;width:100%;max-width:350px;box-shadow:0 20px 60px rgba(0,0,0,.45)"><div style="background:#101216;border-radius:12px;padding:10px 14px;display:inline-block"><img src="launchriot-logo.png" alt="LaunchRiot" style="height:44px;width:auto;display:block"></div><h2 style="margin:12px 0 4px">Sign in</h2><p class="muted" style="margin:0 0 12px">Clifford's workspace</p><label class="muted">Email<input class="in" name="email" type="email" required autocomplete="username"></label><br><br><label class="muted">Password<input class="in" name="password" type="password" required autocomplete="current-password"></label><p id="wh-lerr" style="color:#b00;min-height:18px;font-size:13px">${note||''}</p><button class="btn" style="width:100%">Sign in</button><p style="text-align:center;margin:12px 0 0"><a href="#" id="wh-skip" class="muted" style="font-size:13px">Continue offline (saved in this browser)</a></p></form>`;
 document.body.appendChild(d);
 d.querySelector('#wh-skip').onclick=e=>{e.preventDefault();d.remove()};
 d.querySelector('form').onsubmit=async e=>{e.preventDefault();const f=e.target,er=d.querySelector('#wh-lerr');er.textContent='Signing in…';
  try{await api('/auth/login',{method:'POST',body:JSON.stringify({email:f.email.value.trim(),password:f.password.value})});
   const me=await api('/auth/me');API.user=(me&&me.user)||me;API.authed=true;d.remove();refresh()}
  catch(x){er.textContent=x.status==429?'Too many attempts. Please wait 15 minutes and try again.':x.status==401||x.status==400?'Wrong email or password.':x.status==404||x.status==405||x.status==501?'Sign-in isn’t live yet. You can continue offline for now.':x.status?'Sign-in failed ('+x.status+').':'Sign-in isn’t available from this browser yet. You can continue offline for now.'}}}
window.logout=async()=>{try{await api('/auth/logout',{method:'POST'})}catch(e){}API.authed=false;API.user=null;API.status=[];D.mail=D.mail.filter(x=>!x.remote);['cal','wa','approvals','staff'].forEach(k=>D[k]=D[k].filter(x=>!x.remote));applyCons();save();render();showLogin()};
// ---- data ----
function applyCons(){for(const k in KEY2PROV)D.con[k]=isCon(KEY2PROV[k])?1:0}
function setRemote(key,items){D[key]=D[key].filter(x=>!x.remote).concat(items.map(x=>({...x,remote:1})))}
const fromEmail=m=>String((typeof m.from=='object'?m.from&&m.from.email:'')||((String(m.from||'').match(/<([^>]+)>/)||[])[1])||m.from||'').toLowerCase().trim();
const thr=m=>pick(m,'thread_id','threadId','conversation_id');
function replyOf(m,se,all){if(m.replied===true)return{at:pick(m,'replied_at'),by:m.replied_by};const t0=pick(m,'received_at'),T=thr(m),me=String(se||'').toLowerCase();if(!me||!T)return null;
 const r=all.find(x=>x!==m&&fromEmail(x)==me&&thr(x)==T&&(!t0||new Date(pick(x,'received_at'))>new Date(t0)));return r?{at:pick(r,'received_at'),by:me}:null}
const person=x=>x?(typeof x=='object'?{name:x.name||x.email||'',email:x.email||''}:{name:String(x),email:String(x)}):{name:'',email:''};
const mailMap=m=>({id:'rm'+m.id,rid:m.id,src:UI_SRC[m.source]||'gmail',from:m.from_name?m.from_name+' <'+m.from+'>':pick(m,'from'),subj:pick(m,'subject')||'(no subject)',sum:pick(m,'body_summary','snippet'),pri:m.priority=='high'?'High':'Normal',importance:+m.importance||0,reasons:m.importance_reasons||[],unread:!!m.unread,needs_reply:!!m.flagged,account:m.account||'',is_cc:!!m.is_cc,thread_id:m.thread_id,at:m.received_at,reply:'',st:'Pending'});
const taskMap=(m,closed)=>{const a=person((m.assigned_staff||[])[0]||m.staff_sender);return{id:'rs'+m.id,rid:m.id,staff:a.name||'Unassigned',staff_email:a.email,summary:pick(m,'body_summary','snippet','subject'),subj:pick(m,'subject'),from:pick(m,'from_name','from'),at:m.received_at,auto:(closed||m.replied||m.task_status=='closed')?1:0,replied_at:pick(m,'replied_at'),replied_by:m.replied_by||'',st:'Open'}};
async function loadData(){const soft=p=>api(p).catch(e=>{if(e.status==401)throw e;return null});
 const [prof,sets,drafts]=await Promise.all([soft('/profile'),soft('/settings'),soft('/drafts')]);
 if(prof&&typeof prof=='object')D.profile={...D.profile,...prof};
 if(sets&&typeof sets=='object'){D.settings={...D.settings,...sets};D.settings.staff=sets.staff||D.settings.staff||[]}
 if(drafts)setRemote('approvals',arr(drafts).map(a=>({id:'ra_'+a.id,rid:a.id,bot:a.type=='reminder'?'Reminder':(a.bot||'Assistant'),text:(a.subject?a.subject+': ':'')+(a.body||'').slice(0,160)+(a.to?' → '+[].concat(a.to).join(', '):''),st:({approved_held:'Approved',approved:'Approved',declined:'Declined'})[a.status]||'Pending'})));
 const provs=Object.keys(PROV).filter(isCon);
 const boxes=await Promise.all(provs.map(p=>soft('/inbox?source='+MAILSRC[p]+'&limit=100')));
 const all=boxes.flatMap(b=>arr(b));
 if(provs.length)setRemote('mail',all.map(mailMap));
 const f=new Date(Date.now()-DAY).toISOString(),t=new Date(Date.now()+14*DAY).toISOString();
 const cals=await Promise.all(provs.map(p=>soft('/calendar?source='+p+'&from='+f+'&to='+t).then(x=>arr(x).map(e=>({...dubai(e.starts_at),id:'rc'+e.id,src:p=='google'?'gcal':p=='microsoft'?'outlook':'zcal',title:e.title||'(no title)',location:e.location||'',url:e.meeting_url||''})))));
 if(provs.length)setRemote('cal',cals.flat());
 const [op,cl]=await Promise.all([soft('/staff-tasks?status=open'),soft('/staff-tasks?status=closed')]);
 if(op||cl){setRemote('staff',arr(op).map(m=>taskMap(m,false)).concat(arr(cl).map(m=>taskMap(m,true))))}
 else if(provs.length){setRemote('staff',all.filter(m=>m.is_cc).map(m=>{const x=taskMap(m,false),rp=replyOf(m,x.staff_email,all);if(rp){x.auto=1;x.replied_at=rp.at}return x}))}}
window.remoteSave=async(path,body,method)=>{if(!API.authed)return false;try{await api(path,{method:method||'PUT',body:JSON.stringify(body)});return true}catch(e){toast('Saved here; server save failed ('+(e.status||'offline')+')');return false}};
window.remoteDraft=async body=>{if(!API.authed)return false;try{await api('/drafts',{method:'POST',body:JSON.stringify(body)});await refresh();return true}catch(e){return false}};
async function boot(){try{const me=await api('/auth/me');API.user=(me&&me.user)||me;API.authed=true;API.online=true}
 catch(e){if(e.status){API.online=true;if(!e.status||e.status==401)showLogin()}else{const h=await fetch(API_BASE+'/health').then(r=>r.ok).catch(()=>false);API.online=h;if(h)showLogin()}}
 render();if(API.authed)refresh()}
async function refresh(){if(!API.authed)return;try{API.status=arr(await api('/status'));API.online=true;applyCons();await loadData();save()}catch(e){if(e.status!=401){API.err=e.message}}render()}
// ---- UI overrides ----
const _view=view;
view=function(t){
 if(t=='connections'&&API.authed){const card=p=>{const c=st(p),s=c.state||c.status||'not_configured';
   const lab={connected:'Connected',not_connected:'Not connected yet',not_configured:'Not set up yet',error:'Error'}[s]||s;
   return `<div class="card vivid"><b>${PROV[p].n}</b><p>${pill(lab)}</p>${c.email?`<div class="muted">${esc(c.email)}</div>`:''}<div class="muted">Last synced: ${ago(c.last_sync)}</div>${c.last_error?`<div class="muted" style="color:#b00">${esc(c.last_error)}</div>`:''}<div class="toolbar" style="margin-top:8px">${s=='connected'?`<button class="btn sm" onclick="sync('${PROV[p].k[0]}')">🔄 Sync now</button>`:s=='not_configured'?`<span class="muted">Your LaunchRiot setup will enable this.</span>`:`<button class="btn sm" onclick="apiConnect('${p}')">Connect</button>`}</div></div>`};
  const acct=em=>{const c=gAcct(em),s=(window.__justConnected&&window.__justConnected.toLowerCase()==em&&!c.state)?'connected':(c.state||c.status||'not_connected'),lab={connected:'Connected',not_connected:'Not connected yet',not_configured:'Not set up yet',error:'Error'}[s]||s;
   return `<div class="card vivid"><b>Google · ${em}</b><p>${pill(lab)}</p><div class="muted">Gmail &amp; Calendar · Last synced: ${ago(c.last_sync)}</div>${c.last_error?`<div class="muted" style="color:#b00">${esc(c.last_error)}</div>`:''}<div class="toolbar" style="margin-top:8px">${s=='connected'?`<button class="btn sm" onclick="sync('gmail')">🔄 Sync now</button>`:s=='not_configured'?`<span class="muted">Google sign-in is not set up yet.</span>`:`<button class="btn sm" onclick="apiConnect('google','${em}')">Connect</button>`}</div></div>`};
  return `<h2>Connections</h2><p class="muted">${syncLine()} · Outbound delivery is off: nothing is ever sent from this workspace.</p><div class="grid">${ACCOUNTS.map(acct).join('')}<div class="card vivid"><b>WhatsApp Business</b><p>${pill('Not set up yet')}</p><span class="muted">Your LaunchRiot setup will enable this.</span></div></div><p>${API.user&&API.user.email?esc(API.user.email)+' · ':''}<a href="#" onclick="logout();return false" class="muted">Sign out</a></p>`}
 return _view(t)};
function syncLine(){const t=API.status.map(c=>c.last_sync).filter(Boolean).sort().pop();return API.authed?'Last synced '+ago(t):''}
window.apiConnect=(p,em)=>{const base=location.hostname=='me.launchriot.online'?'https://me.launchriot.online/':'https://cliffordlandman-alt.github.io/launchriot-me/';location.href=API_BASE+'/oauth/'+p+'/start?'+(em?'login_hint='+encodeURIComponent(em)+'&':'')+'return_to='+encodeURIComponent(base)};
const _sync=window.sync;
window.sync=async k=>{const p=KEY2PROV[k];if(!API.authed||!isCon(p))return _sync(k);toast('Syncing…');try{await api('/sync',{method:'POST'});setTimeout(refresh,4000);toast('Sync started')}catch(e){toast('Sync failed ('+(e.status||'offline')+')')}};
const _appr=window.appr;
window.appr=async(id,s)=>{const a=D.approvals.find(a=>a.id==id);if(a&&a.remote){try{await api('/drafts/'+a.rid+'/'+(s=='Approved'?'approve':'decline'),{method:'POST'});a.st=s;save();render();toast(s=='Approved'?'Approved and held. Nothing is sent.':'Declined')}catch(e){toast('Could not update ('+(e.status||'offline')+')')}}else _appr(id,s)};
const _apprTbl=apprTbl;apprTbl=function(){return _apprTbl().replace(/appr\((ra_[^,]+),/g,"appr('$1',")};
const _render=render;render=function(){_render();const tg=document.querySelector('.content .toolbar .tag');if(tg)tg.textContent=API.authed?('● Live · '+syncLine()):API.online?'Not signed in · saved in this browser':'Offline · saved in this browser';
 if(!API.authed&&API.online&&!document.getElementById('wh-signin')){const b=document.createElement('button');b.id='wh-signin';b.className='btn sm';b.textContent='Sign in';b.onclick=()=>showLogin();const tb=document.querySelector('.content .toolbar');tb&&tb.appendChild(b)}};
(function(){const q=new URLSearchParams(location.search),c=q.get('connected'),er=q.get('connect_error'),em=q.get('email');if(c||er||q.has('email')){history.replaceState(null,'',location.pathname+location.hash.split('?')[0]);
 if(c){window.__justConnected=em||'';setTimeout(()=>{toast((em?em+' ':'')+'connected to '+(PROV[c]?PROV[c].n:c));API.authed&&refresh()},400)}else if(er)setTimeout(()=>toast('Connection failed: '+er),400)}})();
removeEventListener('hashchange',_render);addEventListener('hashchange',()=>render());
render();boot();setInterval(refresh,REFRESH_MS);
