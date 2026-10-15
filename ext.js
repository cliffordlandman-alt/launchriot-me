// Extensions: Profile, Settings, unified inbox triage, today's meetings & activities, Friday planner. No sample data, no outbound sending.
SRC.zcal='Zoho Calendar';SRC.manual='Added manually';
D.profile=D.profile||{name:'Clifford Landman',role:'Founder',email:'',phone:'',photo:''};
D.staff=D.staff||[];D.staffMan=D.staffMan||{};
const sst=x=>D.staffMan[x.id]||(x.auto?'Done':x.st||'Open');
D.settings=D.settings||{notify:{brief:true,urgent:true,friday:true,approvals:true},vip:[],keywords:['urgent','quote','breakdown','order','invoice'],staff:[],staff_domains:[]};D.settings.staff=D.settings.staff||[];D.settings.staff_domains=D.settings.staff_domains||[];
// tabs: drop sales figures page label, add Profile + Settings
(function(){const i=TABS.findIndex(t=>t[0]=='sales');if(i>-1)TABS[i]=['sales','Pipeline','MS'];const c=TABS.findIndex(t=>t[0]=='connections');TABS.splice(TABS.findIndex(t=>t[0]=='tasks')+1,0,['staff','Staff tasks','MAS']);TABS.splice(TABS.findIndex(t=>t[0]=='connections'),0,['profile','Profile','MAS'],['settings','Settings','MAS']);})();
const greet=()=>{const h=+new Date().toLocaleString('en-GB',{timeZone:'Asia/Dubai',hour:'2-digit',hour12:false});return h<12?'Good morning':h<17?'Good afternoon':'Good evening'};
const first=()=>esc((D.profile.name||'Clifford').split(' ')[0]);
// ---- email triage ----
const AUTO_RE=/(^|[^a-z])(no[-_.]?reply|do[-_.]?not[-_.]?reply|donotreply|noreply|mailer-daemon|postmaster|notifications?|notify|alerts?|newsletters?|news|updates?|marketing|promo(tions?)?|offers?|deals?|digest|billing|invoices?|receipts?|orders?|support|info|hello|team|admin|system|automated|bounce|ceo|founder|sales|hi|hey|contact|press|careers|jobs|accounts|service|help|community|welcome|feedback|survey)([^a-z]|$)/;
const AUTO_DOM=/@([a-z0-9-]+\.)*(airbnb|medallia|instagram|facebook|microsoft|google|apple|amazon|uber|booking|netflix|spotify|youtube|tiktok|dropbox|atlassian|figma|canva|openai|mailchimp|sendgrid|mailgun|amazonses|substack|linkedin|facebookmail|github|slack|stripe|paypal|shopify|notion|zoom|calendly|eventbrite|mcsv|rsgsv|constantcontact|hubspot|intercom|mandrillapp|sparkpostmail|e|em|news|marketing|mailer|bounce|mg|email)\.[a-z.]+$/;
const AUTO_TXT=/(unsubscribe|view (this )?(email )?in (your )?browser|manage (your )?(email )?preferences|payment (received|confirmation|successful)|receipt for|your (receipt|invoice|order|statement|payment|subscription)|order confirmation|has been shipped|security alert|verification code|one[- ]time (code|password)|password reset|^welcome to|newsletter|weekly digest|daily digest|special offer|% off|limited time|sale ends|free trial|you('| a)re receiving this|do not reply|automated (message|email))/;
function isAuto(m){const f=(m.from||'').toLowerCase(),em=((f.match(/<([^>]+)>/)||[])[1]||f).trim(),loc=em.split('@')[0],t=((m.subj||'')+' '+(m.sum||'')).toLowerCase();
 const dn=(f.split('<')[0]||'').replace(/[0-9]+/g,' ');
 return !!(m.bulk||m.list_unsub||AUTO_RE.test(loc.replace(/[0-9]+/g,''))||(f.includes('<')&&AUTO_RE.test(dn))||AUTO_DOM.test(em)||AUTO_TXT.test(t))}
function isDirect(m){if(m.is_cc)return false;const me=[(m.account||'').toLowerCase()].concat((D.profile&&D.profile.email?[String(D.profile.email).toLowerCase()]:[])).filter(Boolean),to=(m.to||[]).map(x=>String(x).toLowerCase()),cc=(m.cc||[]).map(x=>String(x).toLowerCase());
 if(me.some(a=>cc.some(c=>c.includes(a)))&&!to.some(x=>me.some(a=>x.includes(a))))return false;if(to.length>3)return false;return to.length?to.some(x=>me.some(a=>x.includes(a))):true}
function score(m){const s=D.settings,f=(m.from||'').toLowerCase(),t=((m.subj||'')+' '+(m.sum||'')).toLowerCase();let n=0,why=[];
 // Unread alone never raises priority; API importance/priority are only supporting signals (never enough alone).
 if((s.vip||[]).some(v=>v&&f.includes(v.toLowerCase()))){n+=3;why.push('VIP')}
 if(isAuto(m)&&!(m.needs_reply&&/^re:/i.test(m.subj||'')&&!AUTO_TXT.test(t))){return {n,why:n?why:['Automated / bulk']}}
 const kw=(s.keywords||[]).filter(k=>k&&t.includes(k.toLowerCase()));if(kw.length){n+=2;why.push('“'+kw[0]+'”')}
 if(m.needs_reply){n+=2;why.push('Reply needed')}
 if(isDirect(m)){n+=2;why.push('Direct from a person')}else if(m.is_cc){why.push('CC')}
 if(+m.importance>=60||m.pri=='High'){n+=1}
 (m.reasons||[]).filter(x=>!/addressed to|^unread$/i.test(x)).slice(0,2).forEach(x=>why.push(esc(x)));
 if(m.is_cc&&!(n>=3)){n=Math.min(n,1)}
 return {n,why}}
const MSRC={gmail:'Gmail',outlook:'Outlook',zmail:'Zoho Mail',manual:'Added'};
function mailRow(m){const sc=score(m);return `<div class="card mail ${sc.n>=2?'hot':''}"><div class="mh"><b>${esc(m.subj||'(no subject)')}</b><span class="src s-${m.src}">${MSRC[m.src]||m.src}</span></div><div class="muted">${esc(m.from||'')}${m.unread?' · <b>unread</b>':''}${m.account?` · <span class="chip2" style="font-size:11px">${esc(m.account)}</span>`:''}</div>${m.sum?`<p>${esc(m.sum)}</p>`:''}<div class="chips2">${sc.why.map(w=>`<span class="chip2">${w}</span>`).join('')}</div>${m.st=='Pending'?`<div class="toolbar" style="margin-top:8px"><button class="btn sm" onclick="dismiss('mail','${m.id}')">Mark handled</button></div>`:`<p>${pill(m.st=='Dismissed'?'Handled':m.st)}</p>`}</div>`}
// ---- Friday planner ----
function weekKey(){const d=new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Dubai'}));const j=new Date(d.getFullYear(),0,1);return d.getFullYear()+'-W'+Math.ceil(((d-j)/DAY+j.getDay()+1)/7)}
function isFridayAM(){const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Dubai',weekday:'short',hour:'2-digit',hour12:false}).formatToParts(new Date());const wd=p.find(x=>x.type=='weekday').value,h=+p.find(x=>x.type=='hour').value;return wd=='Fri'&&h>=5&&h<14}
function nextWeek(){const out=[];for(let o=1;o<=10;o++){const d=new Date(Date.now()+o*DAY),wd=d.getDay();if(o>3&&wd==1&&out.length)break;out.push(d.toISOString().slice(0,10))}return out.filter(x=>{const w=new Date(x).getDay();return w>=1&&w<=5}).slice(0,5)}
function planCard(){if(!D.settings.notify.friday)return '';const forced=/plan=1/.test(location.search);if(!forced&&(!isFridayAM()||localStorage.getItem('wh-plan-'+weekKey())))return '';
 const days=nextWeek(),mt=D.cal.filter(e=>days.includes(e.d)).sort((a,b)=>(a.d+a.t)<(b.d+b.t)?-1:1),td=D.tasks.filter(t=>!t.done);
 return `<div class="plan-card"><div class="pc-h"><div><div class="eyebrow2">FRIDAY · PLAN NEXT WEEK</div><h2>Lock in next week, ${first()}.</h2></div><button class="x2" onclick="planDismiss()" aria-label="Dismiss">×</button></div>
 <div class="pc-g"><div><h3>Meetings (${mt.length})</h3>${mt.length?mt.map(e=>`<label class="pl"><input type="checkbox" checked> ${new Date(e.d).toLocaleDateString('en-GB',{weekday:'short',day:'numeric'})} ${e.t} · ${esc(e.title)}</label>`).join(''):'<p class="muted">No meetings yet for next week.</p>'}</div>
 <div><h3>To-dos (${td.length})</h3>${td.length?td.slice(0,8).map(t=>`<label class="pl"><input type="checkbox" checked> ${esc(t.t)}</label>`).join(''):'<p class="muted">No open to-dos.</p>'}<div class="ask"><input class="in" id="pl-new" placeholder="Add a to-do for next week"><button class="btn sm" onclick="planAdd()">Add</button></div></div></div>
 <button class="btn big" onclick="planDone()">Confirm next week’s plan</button></div>`}
window.planDismiss=()=>{localStorage.setItem('wh-plan-'+weekKey(),'dismissed');render()};
window.planDone=()=>{localStorage.setItem('wh-plan-'+weekKey(),'confirmed');toast('Next week’s plan confirmed');render()};
window.planAdd=()=>{const v=document.getElementById('pl-new').value.trim();if(!v)return;D.tasks.unshift({id:Date.now(),t:v,pri:0,done:0});save();render()};

// ---- Staff tasks (from emails where Clifford is CC'd) ----
const ageOf=t=>{if(!t)return '—';const d=Math.floor((Date.now()-new Date(t))/DAY);return d<=0?'today':d==1?'1 day':d+' days'};
function staffRow(x){const st=sst(x),auto=st=='Done'&&x.auto&&!D.staffMan[x.id];return `<div class="st ${st=='Done'?'done-row':''}"><div><b>${esc(x.summary||x.subj)}</b><div class="muted">✉️ ${esc(x.subj||'')}${x.from?' · from '+esc(x.from):''} · ${ageOf(x.at)}${auto?` · <b>staff replied${x.replied_at?' '+new Date(x.replied_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):''}</b>`:''}</div></div><div class="toolbar"><button class="btn sm ${st=='Done'?'dark':''}" onclick="staffTog('${x.id}')">${st=='Done'?'Done ✓ (reopen)':'Open'}</button>${st!='Done'?`<button class="btn sm dark" onclick="staffRemind('${x.id}')">Remind</button>`:''}</div>
 ${remindOpen==x.id?`<div style="flex-basis:100%"><textarea id="rm-${x.id}" rows="3">${esc('Hi '+(x.staff||'').split(' ')[0]+', a quick reminder about: '+(x.summary||x.subj)+'. Can you update me on where this stands? Thanks, '+first())}</textarea><div class="toolbar" style="margin-top:6px"><button class="btn sm" onclick="staffDraft('${x.id}')">Create reminder draft</button><button class="btn sm dark" onclick="remindOpen=null;render()">Cancel</button></div></div>`:''}</div>`}
function staffView(){const open=D.staff.filter(x=>sst(x)!='Done'),done=D.staff.filter(x=>sst(x)=='Done'),groups={};open.forEach(x=>{(groups[x.staff||'Unassigned']=groups[x.staff||'Unassigned']||[]).push(x)});
 const autoD=done.filter(x=>x.auto&&!D.staffMan[x.id]),manD=done.filter(x=>!(x.auto&&!D.staffMan[x.id]));
 return `<h2>Staff tasks</h2><p class="muted">Built from emails where you’re in CC. When the staff member replies on the thread, the task is marked done automatically. Reminders are drafts for you to approve; nothing is sent automatically.</p>
 <details class="card" style="margin:0 0 14px" ${D.staff.length?'':'open'}><summary><b>+ Add</b></summary><div class="grid" style="margin-top:10px"><label class="muted">Staff member<input class="in" id="sf-staff"></label><label class="muted">Task<input class="in" id="sf-sum"></label><label class="muted">Source email subject<input class="in" id="sf-subj"></label><label class="muted">Date<input class="in" id="sf-at" type="date"></label></div><button class="btn sm" style="margin-top:10px" onclick="staffAdd()">Save</button></details>
 ${!D.staff.length?'<p class="muted">No staff tasks yet. They appear here once your email is connected and you’re CC’d on emails, or add one above.</p>':''}
 ${Object.keys(groups).sort().map(g=>`<div class="card vivid" style="margin-bottom:12px"><h3>${esc(g)} <span class="sec-h" style="display:inline"><span>${groups[g].length} open</span></span></h3>${groups[g].map(staffRow).join('')}</div>`).join('')}
 ${D.staff.length&&!open.length?'<p class="muted">All caught up. No open staff tasks.</p>':''}
 ${autoD.length?`<details class="card vivid" id="done-auto" style="margin-bottom:12px"><summary><b>Done (auto: staff replied) · ${autoD.length}</b></summary>${autoD.map(staffRow).join('')}</details>`:''}
 ${manD.length?`<details class="card vivid" style="margin-bottom:12px"><summary><b>Done · ${manD.length}</b></summary>${manD.map(staffRow).join('')}</details>`:''}`}
let remindOpen=null;
window.staffAdd=()=>{const g=i=>document.getElementById(i).value.trim();if(!g('sf-staff')||!g('sf-sum')){toast('Add a staff member and task');return}D.staff.unshift({id:'L'+Date.now(),staff:g('sf-staff'),summary:g('sf-sum'),subj:g('sf-subj'),at:g('sf-at')||new Date().toISOString(),st:'Open'});save();render()};
window.staffTog=id=>{const x=D.staff.find(x=>x.id==id),n=sst(x)=='Done'?'Open':'Done';D.staffMan[id]=n;if(!x.remote)x.st=n;save();render()};
window.staffRemind=id=>{remindOpen=id;render()};
window.staffDraft=async id=>{const x=D.staff.find(x=>x.id==id),txt=document.getElementById('rm-'+id).value.trim();if(!txt)return;remindOpen=null;
 let ok=false;if(window.remoteDraft)ok=await remoteDraft({type:'reminder',to:x.staff_email||x.staff,subject:'Reminder: '+(x.subj||x.summary),body:txt,related_email_id:x.rid||null});
 if(!ok)D.approvals.unshift({id:Date.now(),bot:'Assistant',text:'Reminder to '+x.staff+': '+txt,st:'Pending'});save();toast('Reminder draft created. Approve it in Approvals; nothing was sent.');render()};
// ---- views ----
const _v0=view;
view=function(t){
 if(t=='dashboard'){const ev=D.cal.filter(e=>e.d==today).sort((a,b)=>a.t<b.t?-1:1),acts=D.tasks.filter(t=>!t.done),pm=D.mail.filter(m=>m.st=='Pending'&&score(m).n>=2);
  const has=['mail','wa','cal','tasks','approvals'].some(k=>D[k].length);
  const lines=has?[`<b>${ev.length}</b> meeting${ev.length==1?'':'s'} today`,`<b>${pm.length}</b> priority email${pm.length==1?'':'s'}`,`<b>${D.approvals.filter(a=>a.st=='Pending').length}</b> approvals waiting`]:[];
  return `${planCard()}<section class="hero2"><div class="eyebrow2">${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',timeZone:'Asia/Dubai'})}</div><h1>${greet()}, ${first()}.</h1>
  <div class="brief2">${lines.length?lines.map(l=>`<span>${l}</span>`).join(''):'<p>Your morning brief will appear once data is added.</p>'}</div></section>
  <div class="tiles">${[['📅',ev.length,'Meetings today','calendar'],['✉️',pm.length,'Priority emails','inbox'],['✅',D.approvals.filter(a=>a.st=='Pending').length,'Drafts to approve','drafts'],['👥',D.staff.filter(x=>sst(x)!='Done').length,'Staff tasks open','staff']].map(([i,n,l,h])=>`<a class="tile" href="#/app/${h}"><span class="ti">${i}</span><b>${n}</b><span>${l}</span></a>`).join('')}</div>
  <div class="two"><div class="card vivid"><h3>Today’s meetings</h3>${ev.length?ev.map(e=>`<div class="ev"><b>${e.t||''}</b><span>${esc(e.title)}</span><em class="src s-${e.src}">${SRC[e.src]||''}</em></div>`).join(''):'<p class="muted">No meetings today. Your Google Calendar appears here once connected.</p>'}</div>
  <div class="card vivid"><h3>Activities &amp; to-dos</h3>${acts.length?acts.slice(0,8).map(t=>`<label class="pl"><input type="checkbox" onchange="tick(${t.id})"> ${esc(t.t)}</label>`).join(''):'<p class="muted">Nothing open. Add to-dos on the Tasks page.</p>'}</div></div>
  <div class="card vivid" style="margin-bottom:14px"><h3>Staff tasks</h3>${D.staff.filter(x=>sst(x)!='Done').length?Object.entries(D.staff.filter(x=>sst(x)!='Done').reduce((a,x)=>{a[x.staff||'Unassigned']=(a[x.staff||'Unassigned']||0)+1;return a},{})).map(([k,n])=>`<span class="chip2" style="margin:0 6px 6px 0;display:inline-block">${esc(k)} · ${n} open</span>`).join('')+'<p><a href="#/app/staff">Open Staff tasks →</a></p>':'<p class="muted">No staff tasks yet. They’ll appear from emails where you’re CC’d.</p>'}</div>`}
 if(t=='staff')return staffView();
 if(t=='inbox'){const L=D.mail.slice().sort((a,b)=>score(b).n-score(a).n||(+b.importance||0)-(+a.importance||0)||(b.unread?1:0)-(a.unread?1:0)||String(b.at||'').localeCompare(String(a.at||''))),P=L.filter(m=>score(m).n>=2),O=L.filter(m=>score(m).n<2);
  return `<h2>Inbox</h2><p class="muted">One inbox for both your Gmail accounts. Important mail rises to the top: VIP senders, your keywords and mail that needs a reply. Edit rules in <a href="#/app/settings">Settings</a>.</p>${syncBar('gmail')}
  <h3 class="sec-h hot">Priority <span>${P.length}</span></h3>${P.map(mailRow).join('')||'<p class="muted">No priority mail.</p>'}<h3 class="sec-h">Other <span>${O.length}</span></h3>${O.map(mailRow).join('')||'<p class="muted">Nothing else.</p>'}`}
 if(t=='calendar')return _v0(t).replace(/<div class="toolbar">.*?<\/div>/,syncBar('gcal'));
 if(t=='sales')return _v0(t).replace(/<div class="card" style="margin-bottom:14px"><b>Monthly sales vs target[\s\S]*?<\/div><\/div><\/div>/,'');
 if(t=='profile'){const p=D.profile;return `<h2>Profile</h2><div class="card vivid prof"><div class="ph">${p.photo?`<img src="${p.photo}" alt="">`:`<span>${first()[0]||'G'}</span>`}</div><div class="grid">
  <label class="muted">Name<input class="in" id="pf-name" value="${esc(p.name)}"></label><label class="muted">Role<input class="in" id="pf-role" value="${esc(p.role)}"></label><label class="muted">Email<input class="in" id="pf-email" type="email" value="${esc(p.email)}"></label><label class="muted">Phone<input class="in" id="pf-phone" type="tel" value="${esc(p.phone)}"></label><label class="muted">Photo<input id="pf-photo" type="file" accept="image/*"></label></div>
  <button class="btn" onclick="saveProfile()">Save profile</button></div>`}
 if(t=='settings'){const s=D.settings,n=s.notify;return `<h2>Settings</h2><div class="two"><div class="card vivid"><h3>Notifications</h3>${[['brief','Morning brief'],['urgent','Urgent email alerts'],['approvals','New approvals'],['friday','Friday “Plan next week” prompt']].map(([k,l])=>`<label class="pl"><input type="checkbox" id="ns-${k}" ${n[k]?'checked':''}> ${l}</label>`).join('')}</div>
  <div class="card vivid"><h3>Inbox rules</h3><label class="muted">VIP senders (one per line: name, email or domain)<textarea id="st-vip" rows="4">${esc(s.vip.join('\n'))}</textarea></label><label class="muted">Priority keywords (one per line)<textarea id="st-kw" rows="4">${esc(s.keywords.join('\n'))}</textarea></label></div></div><div class="card vivid" style="margin-bottom:14px"><h3>Staff list</h3><p class="muted">Used to build Staff tasks from emails where you’re CC’d. One per line: <code>Name &lt;email&gt;</code>.</p><textarea id="st-staff" rows="5">${esc(s.staff.map(x=>(x.name?x.name+' <'+x.email+'>':x.email)).join('\n'))}</textarea><label class="muted">Staff email domains (one per line)<textarea id="st-dom" rows="2">${esc(s.staff_domains.join('\n'))}</textarea></label></div>
  <div class="card vivid"><h3>Connections</h3><p class="muted">Your Google accounts and WhatsApp are managed on the <a href="#/app/connections">Connections</a> page.</p></div><button class="btn big" onclick="saveSettings()">Save settings</button>`}
 return _v0(t)};
window.saveProfile=()=>{const g=i=>document.getElementById(i).value.trim(),f=document.getElementById('pf-photo').files[0];const done=ph=>{D.profile={name:g('pf-name'),role:g('pf-role'),email:g('pf-email'),phone:g('pf-phone'),photo:ph};save();window.remoteSave&&remoteSave('/profile',D.profile);toast('Profile saved');render()};
 if(f){if(f.size>1.5e6){toast('Photo too large (max 1.5 MB)');return}const r=new FileReader();r.onload=()=>done(r.result);r.readAsDataURL(f)}else done(D.profile.photo)};
window.saveSettings=()=>{const c=k=>document.getElementById('ns-'+k).checked,l=i=>document.getElementById(i).value.split('\n').map(x=>x.trim()).filter(Boolean);
 D.settings={...D.settings,notify:{brief:c('brief'),urgent:c('urgent'),approvals:c('approvals'),friday:c('friday')},vip:l('st-vip'),keywords:l('st-kw'),staff:l('st-staff').map(x=>{const m=x.match(/^(.*?)\s*<([^>]+)>$/);return m?{name:m[1].trim(),email:m[2].trim()}:{name:'',email:x}}),staff_domains:l('st-dom')};save();window.remoteSave&&remoteSave('/settings',D.settings);toast('Settings saved');render()};
// header shows profile name/role
const _r0=render;render=function(){_r0();const s=document.querySelector('#brand span');if(s)s.innerHTML=`${first()}’s workspace<small>${esc(D.profile.role||'')}</small>`};
removeEventListener('hashchange',_r0);addEventListener('hashchange',()=>render());
