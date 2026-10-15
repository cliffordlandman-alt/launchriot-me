// Click-to-open plain-text email reader. Read-only: no reply/send. All content is escaped; no HTML is ever rendered.
(function(){
 const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const css=document.createElement('style');css.textContent='#rd-ov{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:12px}#rd-box{background:#fff;color:#101216;max-width:760px;width:100%;max-height:90vh;overflow:auto;border-radius:14px;padding:18px 20px;box-shadow:0 10px 40px rgba(0,0,0,.4)}#rd-box h3{margin:0 40px 8px 0}#rd-x{float:right;border:0;background:#eef0f3;border-radius:8px;font-size:18px;width:34px;height:34px;cursor:pointer}.rd-meta{font-size:13px;color:#555;line-height:1.6;word-break:break-word}.rd-body{white-space:pre-wrap;word-break:break-word;margin-top:14px;padding-top:12px;border-top:1px solid #e3e5ea;font-size:14px;line-height:1.55}.rd-note{font-size:12px;color:#8a5a00;background:#fff4d6;border-radius:6px;padding:4px 8px;display:inline-block;margin-top:8px}.card.mail[data-mid]{cursor:pointer}';document.head.appendChild(css);
 let lastFocus=null,tok=0;
 function link(t){ // escape first, then linkify http(s) only
  return E(t).replace(/https?:\/\/[^\s<]+/g,u=>{const m=u.match(/[.,;:!?)&#39;]+$/);const tail=m?m[0]:'';const url=tail?u.slice(0,-tail.length):u;return '<a href="'+url+'" target="_blank" rel="noopener noreferrer nofollow">'+url+'</a>'+tail})}
 const list=a=>[].concat(a||[]).map(x=>typeof x=='object'?(x.name?x.name+' <'+x.email+'>':x.email):x).join(', ');
 function close(){const o=document.getElementById('rd-ov');if(o){o.remove();tok++;if(lastFocus&&lastFocus.focus)try{lastFocus.focus()}catch(e){}}}
 function paint(m,d,preview){const o=document.getElementById('rd-ov');if(!o)return;
  const date=d.date||m.at,ds=date&&!isNaN(new Date(date))?new Date(date).toLocaleString('en-GB',{timeZone:'Asia/Dubai',dateStyle:'medium',timeStyle:'short'})+' (Dubai)':'';
  const body=d.body_text!=null?d.body_text:(d.body||'');
  o.innerHTML='<div id="rd-box" role="dialog" aria-modal="true" aria-label="Email"><button id="rd-x" aria-label="Close">×</button><h3>'+E(d.subject||m.subj||'(no subject)')+'</h3><div class="rd-meta"><div><b>From:</b> '+E(d.from||m.from||'')+'</div><div><b>To:</b> '+E(list(d.to)||'—')+'</div>'+(list(d.cc)?'<div><b>Cc:</b> '+E(list(d.cc))+'</div>':'')+'<div><b>Date:</b> '+E(ds||'—')+'</div>'+(m.account?'<div><b>Account:</b> '+E(m.account)+'</div>':'')+'</div>'+(preview?'<div class="rd-note">Preview only: full message body is not available yet.</div>':'')+'<div class="rd-body">'+(body?link(body):'<span class="muted">(no content)</span>')+'</div></div>';
  o.querySelector('#rd-x').onclick=close;o.querySelector('#rd-x').focus()}
 async function open(m){lastFocus=document.activeElement;close();const my=++tok;
  const o=document.createElement('div');o.id='rd-ov';o.onclick=e=>{if(e.target===o)close()};document.body.appendChild(o);
  const pv={subject:m.subj,from:m.from,to:m.to,cc:m.cc,date:m.at,body_text:m.sum||''};
  paint(m,pv,true);
  if(!m.rid||typeof api!='function'||window.__rdNoDetail)return;
  try{const d=await api('/inbox/'+encodeURIComponent(m.rid));if(my!==tok)return;
   const x=(d&&d.item)||d;if(x&&(x.body_text!=null||x.body!=null||x.body_html!=null)){
    let b=x.body_text!=null?x.body_text:x.body;if(b==null)b=String(x.body_html).replace(/<(style|script)[\s\S]*?<\/\1>/gi,'').replace(/<br\s*\/?>|<\/p>|<\/div>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
    paint(m,{subject:x.subject||m.subj,from:x.from_name?x.from_name+' <'+x.from+'>':(x.from||m.from),to:x.to||m.to,cc:x.cc||m.cc,date:x.date||x.received_at||m.at,body_text:b},false)}}
  catch(e){if(e&&e.status==404)window.__rdNoDetail=true}}
 document.addEventListener('click',e=>{const c=e.target.closest&&e.target.closest('.card.mail[data-mid]');if(!c||e.target.closest('button,a,input,select,textarea'))return;
  const m=(window.D||D).mail.find(x=>String(x.id)===c.getAttribute('data-mid'));if(m)open(m)});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('rd-ov')){e.preventDefault();close()}else if((e.key==='Enter')&&e.target.matches&&e.target.matches('.card.mail[data-mid]'))e.target.click()});
 if(typeof mailRow=='function'){const _mr=mailRow;mailRow=function(m){return _mr(m).replace('<div class="card mail','<div tabindex="0" role="button" title="Open email" data-mid="'+E(m.id)+'" class="card mail')}}
})();
