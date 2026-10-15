// KPIs card on the Dashboard. Static data from Raju's sheet (kpis.json). Targets marked "Suggested target" are defaults, only current values are real.
(function(){
 if(typeof view!=='function'||typeof render!=='function')return;
 const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let K=null,open=false;
 fetch('kpis.json',{cache:'no-cache'}).then(r=>r.json()).then(j=>{K=j;try{render()}catch(e){}}).catch(()=>{});
 window.kpiTog=()=>{open=!open;render()};
 function card(){
  if(!K)return '';
  const by={};K.items.forEach(i=>(by[i.biz]=by[i.biz]||[]).push(i));
  const nu=K.items.filter(i=>i.unsure).length;
  let h='<div class="card" id="kpi-card" style="margin-bottom:14px"><h3>KPIs</h3><p style="margin:4px 0 8px;font-size:13px;opacity:.8">'+K.items.length+' KPIs, '+nu+' with current value unsure. "Suggested target" means a default for you to confirm; only current values are real.</p>'+
   '<p style="font-size:12px;opacity:.7;margin:0 0 8px">Updated from Raju\'s sheet, '+E(K.updated)+'.</p>'+
   '<button class="btn" onclick="kpiTog()">'+(open?'Hide KPIs':'Show all KPIs')+'</button>';
  if(open)for(const b in by){h+='<h4 style="margin:14px 0 6px">'+E(b)+'</h4>';
   by[b].forEach(i=>{h+='<div style="border-top:1px solid rgba(128,128,128,.25);padding:8px 0;font-size:13px;overflow-wrap:anywhere"><b>'+E(i.name)+'</b><br>'+
    'Current: <b>'+(i.unsure?'unsure':E(i.value))+'</b>'+(i.unsure?'':' <span style="opacity:.7">('+E(i.vstatus)+')</span>')+'<br>'+
    'Target: '+(i.target?E(i.target):'none')+' <span class="tag" style="font-size:11px">'+E(i.tlabel)+'</span><br>'+
    '<span style="opacity:.7">Source: '+E(i.source)+' · '+E(i.owner)+' · '+E(i.freq)+'</span>'+(i.note?'<br><span style="opacity:.7">'+E(i.note)+'</span>':'')+'</div>'});}
  return h+'</div>'}
 const _v=view;
 view=function(t){const h=_v(t);if(t!=='dashboard'||typeof h!=='string')return h;const c=card();if(!c)return h;return h.includes('</section>')?h.replace('</section>',()=>'</section>'+c):c+h};
})();
