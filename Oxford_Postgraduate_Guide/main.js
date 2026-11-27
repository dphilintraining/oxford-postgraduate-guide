'use strict';
(function () {
  const menuButton = document.querySelector('.menu-button');
  const mobileMenu = document.querySelector('.mobile-nav');
  if (menuButton && mobileMenu) {
    menuButton.addEventListener('click', () => {
      const opening = !mobileMenu.classList.contains('open');
      mobileMenu.classList.toggle('open', opening);
      menuButton.setAttribute('aria-expanded', String(opening));
      menuButton.setAttribute('aria-label', opening ? 'Close navigation' : 'Open navigation');
      menuButton.querySelector('span').textContent = opening ? '×' : '☰';
    });
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
    }));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && mobileMenu.classList.contains('open')) {
        mobileMenu.classList.remove('open');
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.focus();
      }
    });
  }

  const tabs = Array.from(document.querySelectorAll('.tool-tabs [role="tab"]'));
  if (!tabs.length) return;

  const prefix = 'unofficial-oxford-guide-v1-';
  const load = (key, fallback) => {
    try {
      const value = localStorage.getItem(prefix + key);
      return value === null ? fallback : JSON.parse(value);
    } catch { return fallback; }
  };
  const save = (key, value) => {
    try { localStorage.setItem(prefix + key, JSON.stringify(value)); return true; }
    catch { return false; }
  };
  const escapeHTML = text => String(text).replace(/[&<>"']/g, ch => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[ch]));

  function activateTab(id, updateHash = false) {
    const selected = tabs.find(t => t.dataset.panel === id) || tabs[0];
    tabs.forEach(tab => {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    document.querySelectorAll('.tool-panel').forEach(panel => {
      const active = panel.id === selected.dataset.panel;
      panel.classList.toggle('active', active);
      panel.hidden = !active;
    });
    if (updateHash) history.replaceState(null, '', '#' + selected.dataset.panel);
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(tab.dataset.panel, true));
    tab.addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length-1 : (index + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus();
      activateTab(tabs[next].dataset.panel, true);
    });
  });
  window.addEventListener('hashchange', () => {
    if (tabs.some(t => t.dataset.panel === location.hash.slice(1))) activateTab(location.hash.slice(1));
  });
  activateTab(location.hash.slice(1));

  const TASKS = [
    ['course', 'Choose your course or programmes', 'Compare content, entry requirements, and research interests.'],
    ['entry', 'Read the full course entry requirements', 'Check academic prerequisites, English language requirements, and eligibility.'],
    ['deadline', 'Record the course and funding deadlines', 'Use the dates published for your particular course and cycle.'],
    ['funding', 'Research relevant funding opportunities', 'Check scholarship eligibility and whether separate applications are required.'],
    ['supervisor', 'Check the course’s supervisor-contact guidance', 'Contact potential supervisors only where appropriate for the course.'],
    ['documents', 'Collect transcripts and required documents', 'Check formatting, certified translations, and file requirements.'],
    ['referees', 'Contact referees early', 'Share course details and leave enough time for references.'],
    ['draft', 'Draft the required written materials', 'Follow course-specific instructions and write your own application.'],
    ['review', 'Review your application carefully', 'Check word limits, accuracy, attachments, and all submission requirements.'],
    ['submit', 'Submit before your deadline', 'Confirm submission and monitor your application and references.']
  ];
  const checked = load('planner', {});
  const list = document.getElementById('checklist');
  const renderChecklist = () => {
    list.innerHTML = TASKS.map(([id, label, hint]) => `<div class="check-item"><input type="checkbox" id="task-${id}" data-task="${id}" ${checked[id] ? 'checked' : ''}><label for="task-${id}">${escapeHTML(label)}<small>${escapeHTML(hint)}</small></label></div>`).join('');
    const total = TASKS.filter(([id]) => !!checked[id]).length;
    const percent = Math.round(total / TASKS.length * 100);
    document.getElementById('planner-fill').style.width = percent + '%';
    document.getElementById('planner-progress').setAttribute('aria-valuenow', String(percent));
    document.getElementById('planner-caption').textContent = `${total} of ${TASKS.length} completed · ${percent}%`;
  };
  list.addEventListener('change', event => {
    const input = event.target.closest('input[data-task]');
    if (!input) return;
    checked[input.dataset.task] = input.checked;
    save('planner', checked);
    renderChecklist();
  });
  renderChecklist();

  function saveFile(filename, text, type='text/plain;charset=utf-8') {
    const blob = new Blob([text], {type});
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  document.querySelector('[data-print]').addEventListener('click', () => window.print());
  document.getElementById('download-checklist').addEventListener('click', () => {
    const content = ['THE UNOFFICIAL OXFORD POSTGRADUATE GUIDE', 'Application Planner', 'Independent student-led resource; always check official course requirements.', '', ...TASKS.map(([id,label,hint]) => `${checked[id]?'[x]':'[ ]'} ${label}\n    ${hint}`), '', 'Official guidance: https://www.ox.ac.uk/admissions/graduate/application-guide'];
    saveFile('oxford-application-planner.txt', content.join('\n'));
  });
  document.getElementById('reset-checklist').addEventListener('click', () => {
    if (!window.confirm('Clear all completed checklist items?')) return;
    Object.keys(checked).forEach(key => delete checked[key]);
    save('planner', checked);
    renderChecklist();
  });

  const configs = {
    supervisors: {id:'supervisor-form', body:'supervisors-rows', toast:'supervisors-toast', columns:['name','group','fit','status']},
    funding: {id:'funding-form', body:'funding-rows', toast:'funding-toast', columns:['name','deadline','notes','status']}
  };
  const entries = {supervisors:load('supervisors', []), funding:load('funding', [])};
  for (const [type, config] of Object.entries(configs)) {
    if (!Array.isArray(entries[type])) entries[type] = [];
    const form = document.getElementById(config.id);
    const body = document.getElementById(config.body);
    const toast = document.getElementById(config.toast);
    const render = () => {
      if (!entries[type].length) {
        body.innerHTML = `<tr class="empty-row"><td colspan="${config.columns.length+1}">No ${type === 'funding' ? 'opportunities' : 'researchers'} added yet.</td></tr>`;
        return;
      }
      body.innerHTML = entries[type].map((entry, index) => `<tr>${config.columns.map(key => `<td>${escapeHTML(entry[key] || 'Not entered')}</td>`).join('')}<td><button class="remove-row" type="button" data-remove="${index}" aria-label="Remove ${escapeHTML(entry.name)}" title="Remove row">×</button></td></tr>`).join('');
    };
    render();
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const data = Object.fromEntries(new FormData(form).entries());
      entries[type].push(Object.fromEntries(config.columns.map(key => [key, String(data[key] || '').trim()])));
      const stored = save(type, entries[type]);
      render();
      form.reset();
      form.querySelector('input').focus();
      toast.textContent = stored ? 'Added and saved in this browser.' : 'Added for this session. Browser storage is unavailable.';
    });
    body.addEventListener('click', event => {
      const btn = event.target.closest('[data-remove]');
      if (!btn) return;
      entries[type].splice(Number(btn.dataset.remove), 1);
      save(type, entries[type]);
      render();
      toast.textContent = 'Entry removed.';
    });
  }
  const csvCell = text => {
    let value = String(text ?? '');
    // Prevent spreadsheet applications from interpreting user data as formulas.
    if (/^[\s]*[=+\-@]/.test(value)) value = "'" + value;
    return '"' + value.replace(/"/g, '""') + '"';
  };
  document.querySelectorAll('.export-table').forEach(button => button.addEventListener('click', () => {
    const type = button.dataset.type;
    const config = configs[type];
    const csv = [config.columns.map(csvCell).join(','), ...entries[type].map(entry => config.columns.map(key => csvCell(entry[key])).join(','))].join('\r\n');
    saveFile(`oxford-${type}-tracker.csv`, '\ufeff'+csv, 'text/csv;charset=utf-8');
  }));
})();
