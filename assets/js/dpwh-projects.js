// DPWH infrastructure contracts for Albay, published on the DPWH Transparency Portal.
// Every figure shown comes from data/dpwh-projects.json; nothing is estimated. The short type
// badge is derived by keyword from the source's own category and description text, and the raw
// category is always kept in the badge's title attribute.
(function () {
  'use strict';

  const escapeHtml = (value) =>
    String(value ?? '—').replace(
      /[&<>"']/g,
      (character) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]
    );

  // Stages exactly as the portal publishes them, most common first.
  const STAGE_ORDER = ['On-Going', 'Completed', 'For Procurement', 'Not Yet Started', 'Terminated'];

  // Keyword map used only for the compact type badge. Order matters: a contract described as
  // both a bridge and a flood-control structure is badged as a bridge.
  const TYPE_RULES = [
    ['bridges', /bridge|viaduct|flyover|footbridge/i],
    ['flood', /flood|drainage|river|creek|hydraul|dike|levee|desilt/i],
    ['water', /water supply|water system|waterworks|sewer|septage|deep ?well|level \d/i],
    ['roads', /road|highway|pavement|asphalt|pccp|gravel|carriageway|intersection/i],
    [
      'buildings',
      /building|hospital|health|school|classroom|market|gym|multi.?purpose|facilit|hall|center|centre|sports|evacuation|clinic|warehouse/i,
    ],
  ];

  const TYPE_LABELS = {
    buildings: 'Building',
    roads: 'Road',
    bridges: 'Bridge',
    flood: 'Flood control',
    water: 'Water',
    other: 'Unclassified',
  };

  function validProject(project) {
    return (
      project &&
      typeof project.name === 'string' &&
      project.name.trim() &&
      typeof project.category === 'string' &&
      Number.isFinite(project.cost) &&
      project.cost >= 0 &&
      Number.isFinite(project.status) &&
      project.status >= 0 &&
      project.status <= 100 &&
      project._status !== 'draft'
    );
  }

  // Explicit flood-control wording: if any of this appears, the contract is flood control no
  // matter what else the description mentions.
  const FLOOD_WORDING = /flood|hydraul|dike|levee|desilt|river|creek/i;
  const ROAD_WORDING = /road|highway|pavement|asphalt|pccp|carriageway|intersection/i;

  function typeOf(project) {
    const source = `${project.category || ''} ${project.name || ''}`;
    const bucket = TYPE_RULES.find(([, pattern]) => pattern.test(source));
    // "Construction of road with drainage system" is roadwork, not a flood-control structure, so
    // the weak `drainage` signal must not outrank an explicit road description.
    if (
      bucket &&
      bucket[0] === 'flood' &&
      !FLOOD_WORDING.test(source) &&
      ROAD_WORDING.test(source)
    ) {
      return 'roads';
    }
    return bucket ? bucket[0] : 'other';
  }

  function stageOf(project) {
    if (typeof project.stage === 'string' && project.stage.trim()) return project.stage;
    if (project.status === 100) return 'Completed';
    return project.status > 0 ? 'On-Going' : 'Not Yet Started';
  }

  function date(value) {
    if (!value) return '—';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? '—'
      : parsed.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function money(value) {
    return (
      '₱' +
      Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
  }

  // Compact headline figure. The exact centavo value is always available in the tooltip.
  function moneyCompact(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return '—';
    const abs = Math.abs(amount);
    if (abs >= 1e9) return `₱${(amount / 1e9).toFixed(2)} B`;
    if (abs >= 1e6) return `₱${(amount / 1e6).toFixed(2)} M`;
    if (abs >= 1e3) return `₱${(amount / 1e3).toFixed(2)} K`;
    return money(amount);
  }

  // Splits "SUNWEST, INC. (15906)" into its name and the portal's contractor code.
  function splitContractor(value) {
    if (!value) return { name: null, code: null };
    const match = /^(.*?)\s*\((\d{3,})\)\s*$/.exec(value);
    return match ? { name: match[1].trim(), code: match[2] } : { name: value, code: null };
  }

  // The data file stores each contract as a positional array resolved through _dictionaries.
  // An already-decoded payload (plain objects) passes straight through.
  function decodeProjects(payload) {
    if (!payload || !Array.isArray(payload.projects)) {
      throw new Error('Invalid DPWH project response');
    }
    const columns = payload._columns;
    const rows = payload.projects;
    if (!Array.isArray(columns) || !rows.length || !Array.isArray(rows[0])) return payload;
    const at = {};
    columns.forEach((name, index) => {
      at[name] = index;
    });
    const required = [
      'contractId',
      'description',
      'category',
      'cost',
      'progress',
      'stage',
      'office',
    ];
    if (required.some((name) => !Number.isInteger(at[name]))) return payload;
    const dictionaries = payload._dictionaries || {};
    const resolve = (dictionary, index) => {
      const list = dictionaries[dictionary];
      return Array.isArray(list) && Number.isInteger(index) && index >= 0 && index < list.length
        ? list[index]
        : null;
    };
    const cell = (row, name) => (at[name] === undefined ? null : row[at[name]]);
    payload.projects = rows.map((row) => ({
      id: cell(row, 'contractId'),
      name: cell(row, 'description'),
      category: resolve('category', cell(row, 'category')),
      cost: cell(row, 'cost'),
      status: cell(row, 'progress'),
      stage: resolve('stage', cell(row, 'stage')),
      office: resolve('office', cell(row, 'office')),
      contractor: cell(row, 'contractor'),
      startDate: cell(row, 'startDate'),
      completionDate: cell(row, 'completionDate'),
      year: cell(row, 'infraYear'),
      program: resolve('program', cell(row, 'program')),
      funding: resolve('funding', cell(row, 'funding')),
    }));
    return payload;
  }

  const PAGE_SIZE = 25;

  function renderProjects(container, data) {
    if (!data || !Array.isArray(data.projects)) throw new Error('Invalid DPWH project response');
    const projects = data._status === 'draft' ? [] : data.projects.filter(validProject);
    if (!projects.length) {
      container.innerHTML =
        '<p role="status">Verified Albay project data is not yet available.</p><p><a href="https://transparency.dpwh.gov.ph/" target="_blank" rel="noopener noreferrer">DPWH Transparency Portal</a></p>';
      return;
    }

    const stageCounts = new Map();
    for (const project of projects) {
      const stage = stageOf(project);
      stageCounts.set(stage, (stageCounts.get(stage) || 0) + 1);
    }
    const stages = [
      ...STAGE_ORDER.filter((stage) => stageCounts.has(stage)),
      ...[...stageCounts.keys()].filter((stage) => !STAGE_ORDER.includes(stage)).sort(),
    ];

    const tabs = [
      `<button class="dpwh-tab active" type="button" data-filter="all" aria-pressed="true">All<span class="dpwh-tab-count">${projects.length.toLocaleString('en-PH')}</span></button>`,
      ...stages.map(
        (stage) =>
          `<button class="dpwh-tab" type="button" data-filter="${escapeHtml(stage)}" aria-pressed="false">${escapeHtml(stage)}<span class="dpwh-tab-count">${stageCounts.get(stage).toLocaleString('en-PH')}</span></button>`
      ),
    ].join('');

    container.innerHTML = `<div class="dpwh-controls"><div class="dpwh-filter-group" role="group" aria-label="Filter contracts by status">${tabs}</div><div class="dpwh-search-wrap"><i class="bi bi-search" aria-hidden="true"></i><input class="dpwh-search-input" id="dpwh-search" type="search" autocomplete="off" placeholder="Search description, contractor or contract ID" aria-label="Search contracts" /></div></div><div class="dpwh-summary-bar" id="dpwh-summary"></div><div class="dpwh-table-wrap"><table class="dpwh-table"><caption class="dpwh-caption">Cost is the contract budget published by DPWH, not an amount paid. Accomplishment is the physical progress DPWH reported at the time of collection.</caption><thead><tr><th scope="col" class="col-desc">Contract Description</th><th scope="col" class="col-contractor">Contractor</th><th scope="col" class="col-cost">Cost</th><th scope="col" class="col-status">Status</th><th scope="col" class="col-date">Completion</th></tr></thead><tbody id="dpwh-table-body"></tbody></table><div id="dpwh-load-more" class="dpwh-load-more"></div></div>`;

    const body = container.querySelector('#dpwh-table-body');
    const more = container.querySelector('#dpwh-load-more');
    const summary = container.querySelector('#dpwh-summary');
    const search = container.querySelector('#dpwh-search');
    let filter = 'all';
    let query = '';
    let selected = projects;
    let displayed = PAGE_SIZE;

    function rollDpwhText(element, targetText, forcedStart) {
      if (!element) return;
      if (typeof targetText !== 'string') targetText = String(targetText == null ? '' : targetText);

      const regex = /^([^\d\-+]*)([+-]?)([\d,]+(?:\.\d+)?)(.*)$/;
      const match = targetText.trim().match(regex);
      if (!match) {
        element.textContent = targetText;
        return;
      }

      if (
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        element.textContent = targetText;
        return;
      }

      if (element._rollAnimId) {
        cancelAnimationFrame(element._rollAnimId);
        element._rollAnimId = null;
      }

      const rawPrefix = match[1];
      const sign = match[2];
      const numStr = match[3];
      const suffix = match[4];
      const fullPrefix = rawPrefix + (sign || '');
      const cleanNumStr = numStr.replace(/,/g, '');
      const targetNum = parseFloat(cleanNumStr);
      if (Number.isNaN(targetNum)) {
        element.textContent = targetText;
        return;
      }

      const hasCommas = numStr.includes(',');
      const decIndex = numStr.indexOf('.');
      const decimals = decIndex >= 0 ? numStr.length - decIndex - 1 : 0;

      let startNum = 0;
      if (typeof forcedStart === 'number') {
        startNum = forcedStart;
      } else {
        const curMatch = element.textContent.trim().match(regex);
        if (curMatch) {
          const parsedCur = parseFloat(curMatch[3].replace(/,/g, ''));
          if (!Number.isNaN(parsedCur)) startNum = curMatch[2] === '-' ? -parsedCur : parsedCur;
        }
      }

      if (startNum === targetNum && element.textContent === targetText) return;

      const animDuration = 450;
      const startTime =
        typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();

      element.classList.remove('rolling');
      void element.offsetWidth;
      element.classList.add('rolling');

      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / animDuration);
        const ease = 1 - Math.pow(1 - progress, 4);
        const currentVal = startNum + (targetNum - startNum) * ease;

        if (progress < 1) {
          const absVal = Math.abs(currentVal);
          let part = decimals > 0 ? absVal.toFixed(decimals) : Math.round(absVal).toString();
          if (hasCommas) {
            const split = part.split('.');
            split[0] = split[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            part = split.join('.');
          }
          let pfx = fullPrefix;
          if (pfx === '+' && currentVal <= 0) pfx = '';
          else if (currentVal < 0 && !pfx.includes('-')) pfx = '-' + pfx;
          element.textContent = pfx + part + suffix;
          element._rollAnimId = requestAnimationFrame(step);
        } else {
          element.textContent = targetText;
          element._rollAnimId = null;
          setTimeout(() => {
            element.classList.remove('rolling');
          }, 80);
        }
      }

      if (typeof requestAnimationFrame === 'function') {
        element._rollAnimId = requestAnimationFrame(step);
      } else {
        element.textContent = targetText;
      }
    }

    function paintSummary(isInitial) {
      if (!summary) return;
      const total = selected.reduce((sum, project) => sum + project.cost, 0);
      const completed = selected.filter((project) => stageOf(project) === 'Completed').length;
      const ongoing = selected.filter((project) => stageOf(project) === 'On-Going').length;
      const exact = money(total);
      const costFormatted = moneyCompact(total);
      const contractsFormatted = selected.length.toLocaleString('en-PH');
      const completedFormatted = completed.toLocaleString('en-PH');
      const ongoingFormatted = ongoing.toLocaleString('en-PH');

      let costEl = summary.querySelector('.dpwh-cost-val');
      let contractsEl = summary.querySelector('.dpwh-contracts-val');
      let completedEl = summary.querySelector('.dpwh-completed-val');
      let ongoingEl = summary.querySelector('.dpwh-ongoing-val');

      if (!costEl) {
        summary.innerHTML = `<div class="dpwh-summary-item"><span class="dpwh-summary-value dpwh-cost-val" title="${escapeHtml(exact)}">${escapeHtml(costFormatted)}</span><span class="dpwh-summary-label">Contract Cost</span></div><div class="dpwh-summary-item"><span class="dpwh-summary-value dpwh-contracts-val">${contractsFormatted}</span><span class="dpwh-summary-label">Contracts</span></div><div class="dpwh-summary-item"><span class="dpwh-summary-value dpwh-completed-val">${completedFormatted}</span><span class="dpwh-summary-label">Completed</span></div><div class="dpwh-summary-item"><span class="dpwh-summary-value dpwh-ongoing-val">${ongoingFormatted}</span><span class="dpwh-summary-label">On-Going</span></div>`;
        costEl = summary.querySelector('.dpwh-cost-val');
        contractsEl = summary.querySelector('.dpwh-contracts-val');
        completedEl = summary.querySelector('.dpwh-completed-val');
        ongoingEl = summary.querySelector('.dpwh-ongoing-val');
      } else {
        costEl.title = exact;
      }

      rollDpwhText(costEl, costFormatted, isInitial ? 0 : undefined);
      rollDpwhText(contractsEl, contractsFormatted, isInitial ? 0 : undefined);
      rollDpwhText(completedEl, completedFormatted, isInitial ? 0 : undefined);
      rollDpwhText(ongoingEl, ongoingFormatted, isInitial ? 0 : undefined);
    }

    function rowHtml(project) {
      const type = typeOf(project);
      const stage = stageOf(project);
      const badge = /^completed$/i.test(stage)
        ? 'complete'
        : /on-?going/i.test(stage)
          ? 'ongoing'
          : 'neutral';
      const contractor = splitContractor(project.contractor);
      const progress =
        badge === 'ongoing'
          ? `<span class="dpwh-progress">${project.status.toFixed(1)}%</span>`
          : '';
      const place = [project.office, project.year ? `FY ${project.year}` : null]
        .filter(Boolean)
        .map((part) => escapeHtml(part))
        .join(' · ');
      return `<tr class="dpwh-row"><td class="col-desc"><span class="dpwh-desc-wrap"><span class="dpwh-proj-id">${escapeHtml(project.id)}</span><span class="dpwh-cat-badge ${type}" title="${escapeHtml(project.category)}">${escapeHtml(TYPE_LABELS[type])}</span></span><span class="dpwh-proj-title" title="${escapeHtml(project.name)}">${escapeHtml(project.name)}</span><span class="dpwh-proj-location"><i class="bi bi-geo-alt"></i> ${place || '—'}</span></td><td class="col-contractor">${
        contractor.name
          ? `<span class="dpwh-contractor">${escapeHtml(contractor.name)}</span>`
          : '<span class="dpwh-contractor dpwh-contractor-none">No contractor assigned yet</span>'
      }${
        contractor.code
          ? `<span class="dpwh-contractor-id">Contractor code ${escapeHtml(contractor.code)}</span>`
          : ''
      }</td><td class="col-cost">${escapeHtml(money(project.cost))}</td><td class="col-status"><span class="dpwh-badge ${badge}">${escapeHtml(stage)}</span>${progress}</td><td class="col-date">${escapeHtml(date(project.completionDate))}</td></tr>`;
    }

    function renderRows() {
      const rows = selected.slice(0, displayed);
      body.innerHTML = rows.length
        ? rows.map(rowHtml).join('')
        : '<tr><td colspan="5" class="dpwh-no-match">No contracts match your search.</td></tr>';
      const remaining = selected.length - rows.length;
      more.innerHTML =
        remaining > 0
          ? `<button class="dpwh-load-btn" type="button">Load ${Math.min(PAGE_SIZE, remaining)} more <span class="dpwh-remaining">${remaining.toLocaleString('en-PH')} remaining</span></button>`
          : `<span class="dpwh-end-msg">Showing all ${selected.length.toLocaleString('en-PH')} contract${selected.length === 1 ? '' : 's'}</span>`;
      if (more && typeof more.querySelector === 'function') {
        const button = more.querySelector('button');
        if (button && typeof button.addEventListener === 'function') {
          button.addEventListener('click', () => {
            displayed += PAGE_SIZE;
            renderRows();
          });
        }
      }
    }

    function apply() {
      const needle = query.trim().toLowerCase();
      selected = projects.filter((project) => {
        if (filter !== 'all' && stageOf(project) !== filter) return false;
        if (!needle) return true;
        return `${project.id} ${project.name} ${project.contractor || ''} ${project.office || ''}`
          .toLowerCase()
          .includes(needle);
      });
      displayed = PAGE_SIZE;
      paintSummary();
      renderRows();
    }

    if (typeof container.querySelectorAll === 'function') {
      container.querySelectorAll('[data-filter]').forEach((button) =>
        button.addEventListener('click', () => {
          if (!button.dataset) return;
          filter = button.dataset.filter;
          container.querySelectorAll('[data-filter]').forEach((tab) => {
            tab.classList.toggle('active', tab === button);
            tab.setAttribute('aria-pressed', String(tab === button));
          });
          apply();
        })
      );
    }
    if (search && typeof search.addEventListener === 'function') {
      search.addEventListener('input', () => {
        query = search.value;
        apply();
      });
    }

    paintSummary(true);
    renderRows();
  }

  async function loadDPWHProjects() {
    const container = document.getElementById('dpwh-projects-container');
    if (!container) return;
    container.innerHTML =
      '<div class="dpwh-table-wrap" aria-busy="true"><div class="dpwh-skeleton-row"></div><div class="dpwh-skeleton-row"></div><div class="dpwh-skeleton-row"></div><div class="dpwh-skeleton-row"></div></div>';
    try {
      const response = await fetch('../data/dpwh-projects.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error(`DPWH request failed (${response.status})`);
      renderProjects(container, decodeProjects(await response.json()));
    } catch (error) {
      console.error('[DPWH projects] Unable to load records:', error);
      container.innerHTML =
        '<p role="status">Project data could not be loaded. Please try again later.</p><p><a href="https://transparency.dpwh.gov.ph/" target="_blank" rel="noopener noreferrer">DPWH Transparency Portal</a></p>';
    }
  }

  if (typeof module !== 'undefined' && module.exports)
    module.exports = {
      validProject,
      decodeProjects,
      renderProjects,
      loadDPWHProjects,
      typeOf,
      stageOf,
    };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading')
      document.addEventListener('DOMContentLoaded', loadDPWHProjects);
    else loadDPWHProjects();
  }
})();
