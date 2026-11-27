'use strict';
(function () {
  const records = window.OXFORD_FUNDING_DATA;
  const results = document.getElementById('funding-results');
  if (!results || !Array.isArray(records)) return;
  const $ = id => document.getElementById(id);
  const filters = {
    search: $('funding-query'), degree: $('filter-degree'), subject: $('filter-subject'),
    coverage: $('filter-coverage'), route: $('filter-route'), status: $('filter-status'),
    saved: $('filter-saved'), sort: $('filter-sort'), deadline: $('filter-deadline'), provider: $('filter-provider')
  };
  const key = 'unofficial-oxford-funding-explorer-shortlist-v1';
  let saved = new Set();
  try {
    const prior = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(prior)) saved = new Set(prior.filter(id => records.some(x => x.id === id)));
  } catch (_err) {}
  let visibleLimit = 9;
  function daysToDeadline(rec) {
    if (!rec.deadlineDate) return null;
    // Calendar-day comparison in the UK avoids late-evening US timezone off-by-one issues.
    const parts = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const get = type => Number(parts.find(p=>p.type===type).value);
    const value = Date.parse(rec.deadlineDate+'T00:00:00Z');
    return Math.round((value-Date.UTC(get('year'),get('month')-1,get('day')))/86400000);
  }
  function effectiveStatus(rec) { return rec.status === 'closed' || (daysToDeadline(rec) !== null && daysToDeadline(rec) < 0) ? 'closed':rec.status; }

  const h = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const statusText = {published:'2027 details published',pending:'2027 details UNCONFIRMED',closed:'2027 application closed'};
  const routeText = {automatic:'Automatic consideration',additional:'Extra application step',invitation:'Invited to apply',department:'Department / project',mixed:'Depends on route'};
  const coverageText = {full:'Fees + living costs',variable:'Variable / partial / fees only'};
  const degText = v => v.length === 2 ? "Master's & DPhil" : v[0] === 'masters' ? "Master's" : 'DPhil';
  const subjectText = {all:'All subjects',humanities:'Humanities',social:'Social sciences',medical:'Medical sciences',stem:'Maths, physical & life sciences',law:'Law',business:'Business'};
  function filterList() {
    const q=filters.search.value.toLocaleLowerCase().trim();
    const terms=q.split(/\s+/).filter(Boolean);
    return records.filter(record=>{
      if (filters.degree.value !== 'all' && !record.degree.includes(filters.degree.value)) return false;
      if (filters.subject.value !== 'all' && !record.subjects.includes('all') && !record.subjects.includes(filters.subject.value)) return false;
      if (filters.coverage.value !== 'all' && record.coverage !== filters.coverage.value) return false;
      if (filters.route.value !== 'all' && record.route !== filters.route.value) return false;
      if (filters.provider && filters.provider.value !== 'all' && record.scope !== filters.provider.value) return false;
      if (filters.status.value !== 'all' && effectiveStatus(record) !== filters.status.value) return false;
      const dd=daysToDeadline(record);
      if (filters.deadline.value==='soon' && !(dd!==null && dd>=0 && dd<=30)) return false;
      if (filters.deadline.value==='passed' && effectiveStatus(record)!=='closed') return false;
      if (filters.deadline.value==='undated' && dd!==null) return false;
      if (filters.saved.checked && !saved.has(record.id)) return false;
      const haystack=[record.name, record.audience, record.summary, record.deadline, record.nextStep, record.college,record.kind,record.scope,record.subjects.join(' '),routeText[record.route]].join(' ').toLocaleLowerCase();
      return terms.every(t=>haystack.includes(t));
    }).sort((a,b)=>{
      if (filters.sort.value === 'deadline') return (daysToDeadline(a)===null?1e7:daysToDeadline(a)<0?1e6+Math.abs(daysToDeadline(a)):daysToDeadline(a))-(daysToDeadline(b)===null?1e7:daysToDeadline(b)<0?1e6+Math.abs(daysToDeadline(b)):daysToDeadline(b));
      if (filters.sort.value === 'name') return a.name.localeCompare(b.name);
      if (filters.sort.value === 'status') return ['published','pending','closed'].indexOf(effectiveStatus(a))-['published','pending','closed'].indexOf(effectiveStatus(b)) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
  }
  function card(record) {
    const bookmarked=saved.has(record.id);
    const currentStatus=effectiveStatus(record);
    const statusClass=currentStatus === 'published'?'ok':currentStatus === 'pending'?'pending':'closed';
    return `<article class="funding-card" data-id="${h(record.id)}">
      <div class="funding-card-top"><span class="scholar-type">${h(record.kind)} · ${h({university:'University',college:'College',department:'Institute / department',external:'External'}[record.scope]||'Other')}</span><span class="funding-status ${statusClass}">${h(statusText[currentStatus])}</span></div>
      <h4>${h(record.name)}</h4><p class="scholar-summary">${h(record.summary)}</p>${record.nextCycle?`<p class="next-cycle-note"><strong>Next cycle: ${h(record.nextCycle)}</strong><br>${h(record.nextCycleOpens || 'Opening date not yet confirmed.')}</p>`:''}${record.auditStatus==='carried over unchecked'?'<p class="unchecked-caution">Source not independently checked in this revision. Confirm before relying on this listing.</p>':''}${record.status==='pending'?'<p class="pending-caution">Historical scheme information only. A 2027 to 2028 award is not yet confirmed.</p>':''}
      <div class="funding-meta"><span>🎓 ${h(degText(record.degree))}</span><span>✦ ${h(coverageText[record.coverage])}</span><span>◷ ${h(routeText[record.route])}</span></div>
      <details class="funding-detail"><summary>Eligibility, deadlines & next steps</summary>
       <dl><div><dt>Who may be eligible</dt><dd>${h(record.audience)}</dd></div>
       <div><dt>Deadline</dt><dd>${h(record.deadline)}</dd></div>
       <div><dt>What to do</dt><dd>${h(record.nextStep)}</dd></div>${record.college?`<div><dt>College</dt><dd>${h(record.college)}</dd></div>`:''}
       </dl><p class="verified-at">${record.auditStatus==='checked against official source'&&record.reviewed?`Official source checked ${h(record.reviewed)}`:'Carried over unchecked'} · ${h(record.verificationNote || 'Consult the official source')}</p>
      </details>
      <div class="funding-card-actions"><a href="${h(record.source)}" target="_blank" rel="noopener noreferrer" class="source-button">Official details <span aria-hidden="true">↗</span></a><button type="button" class="save-award ${bookmarked?'selected':''}" data-save="${h(record.id)}" aria-pressed="${bookmarked}" aria-label="${bookmarked?'Remove':'Save'} ${h(record.name)}">${bookmarked?'♥ Saved':'♡ Save'}</button></div>
    </article>`;
  }
  function render() {
    const found=filterList();
    const shown=found.slice(0,visibleLimit);
    results.innerHTML=shown.length?shown.map(card).join(''):`<div class="empty-funding"><h4>No matching opportunities</h4><p>Try widening the filters or clearing your search. These are only curated starter listings, not every Oxford award.</p><button class="button secondary small" id="clear-empty" type="button">Clear filters</button></div>`;
    $('result-count').textContent=`${found.length} matching ${found.length===1?'opportunity':'opportunities'} · ${saved.size} saved`;
    $('show-more').hidden=found.length<=visibleLimit;
    const active=[];
    if (filters.search.value.trim()) active.push('Keyword');
    ['degree','subject','coverage','route','status','deadline','provider'].forEach(key=>{if(filters[key].value!=='all')active.push(filters[key].selectedOptions[0].textContent);});
    if(filters.saved.checked)active.push('Saved only');
    $('active-filters').textContent=active.length?'Filters: '+active.join(' · '):'Browse all curated listings';
  }
  function reset() {
    filters.search.value='';
    for (const id of ['degree','subject','coverage','route','status','deadline','provider']) filters[id].value='all';
    filters.saved.checked=false;
    filters.sort.value='deadline';visibleLimit=9;render();
    filters.search.focus();
  }
  function saveLocal() {
    try {localStorage.setItem(key,JSON.stringify(Array.from(saved)));return true;}catch (_err) {return false;}
  }
  $('filters-reset').addEventListener('click',reset);
  Object.entries(filters).forEach(([key,input])=>input.addEventListener(key==='search'?'input':'change',()=>{visibleLimit=9;render();}));
  results.addEventListener('click',e=>{
    const clear=e.target.closest('#clear-empty');if(clear){reset();return;}
    const btn=e.target.closest('button[data-save]');if(!btn)return;
    const id=btn.dataset.save;
    if(saved.has(id))saved.delete(id);else saved.add(id);
    saveLocal();render();
  });
  $('show-more').addEventListener('click',()=>{visibleLimit+=9;render();});
  $('export-saved').addEventListener('click',()=>{
    const selected=records.filter(r=>saved.has(r.id));
    if(!selected.length){$('result-count').textContent='Save an opportunity first, then export your shortlist.';return;}
    const columns=['name','degree','subjects','coverage','route','status','audience','deadline','deadlineDate','nextCycle','scope','auditStatus','nextStep','verificationNote','reviewed','source'];
    const escapeCsv=value=>{let s=Array.isArray(value)?value.join('; '):String(value??'');if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
    const csv='\ufeff'+[columns.map(escapeCsv).join(','),...selected.map(r=>columns.map(c=>escapeCsv(r[c])).join(','))].join('\r\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='oxford-funding-shortlist-2027-28.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  });
  render();
})();
