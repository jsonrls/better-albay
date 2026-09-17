// Only published, valid records contribute to the displayed project totals.
(function () {
  'use strict';
  const escapeHtml = (value) =>
    String(value ?? '—').replace(
      /[&<>"']/g,
      (character) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]
    );
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
  function category(project) {
    if (project.category.includes('Flood')) return 'flood';
    if (project.category.includes('Road')) return 'roads';
    if (project.category.includes('Water')) return 'water';
    return 'buildings';
  }
  function date(value) {
    if (!value) return '—';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? '—'
      : parsed.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  function renderProjects(container, data) {
    if (!data || !Array.isArray(data.projects)) throw new Error('Invalid DPWH project response');
    const projects = data._status === 'draft' ? [] : data.projects.filter(validProject);
    if (!projects.length) {
      container.innerHTML =
        '<p role="status">Verified Albay project data is not yet available.</p><p><a href="https://www.dpwh.gov.ph/">Visit the official DPWH website</a></p>';
      return;
    }
    const completed = projects.filter((project) => project.status === 100).length;
    const total = projects.reduce((sum, project) => sum + project.cost, 0);
    const money = (value) =>
      '₱' + value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    container.innerHTML = `<div class="dpwh-summary-bar"><div class="dpwh-summary-item"><span class="dpwh-summary-value">${projects.length}</span><span class="dpwh-summary-label">Projects</span></div><div class="dpwh-summary-item"><span class="dpwh-summary-value">${money(total)}</span><span class="dpwh-summary-label">Total Investment</span></div><div class="dpwh-summary-item"><span class="dpwh-summary-value">${completed}</span><span class="dpwh-summary-label">Completed</span></div></div><div class="dpwh-controls"><div class="dpwh-filter-group" aria-label="Filter projects by category">${['all', 'buildings', 'roads', 'flood', 'water'].map((filter) => `<button class="dpwh-tab${filter === 'all' ? ' active' : ''}" data-filter="${filter}" aria-pressed="${filter === 'all'}">${filter[0].toUpperCase() + filter.slice(1)}</button>`).join('')}</div></div><div class="dpwh-table-wrap"><table class="dpwh-table"><thead><tr><th scope="col">Contract Description</th><th scope="col">Contractor</th><th scope="col">Cost</th><th scope="col">Status</th><th scope="col">Completed</th></tr></thead><tbody id="dpwh-table-body"></tbody></table><div id="dpwh-load-more" class="dpwh-load-more"></div></div>`;
    let selected = projects;
    let displayed = 8;
    const body = container.querySelector('#dpwh-table-body');
    const more = container.querySelector('#dpwh-load-more');
    function renderRows() {
      body.innerHTML =
        selected
          .slice(0, displayed)
          .map(
            (project) =>
              `<tr class="dpwh-row"><td><span class="dpwh-proj-id">${escapeHtml(project.id)}</span><span class="dpwh-proj-title">${escapeHtml(project.name)}</span><span class="dpwh-proj-location">${escapeHtml(project.location)}</span></td><td>${escapeHtml(project.contractor)}</td><td>${money(project.cost)}</td><td>${project.status === 100 ? 'Completed' : project.status.toFixed(0) + '%'}</td><td>${date(project.completionDate)}</td></tr>`
          )
          .join('') || '<tr><td colspan="5">No projects in this category.</td></tr>';
      more.innerHTML =
        displayed < selected.length
          ? '<button class="dpwh-load-btn" type="button">Load More</button>'
          : `<span class="dpwh-end-msg">Showing all ${selected.length} projects</span>`;
      const button = more.querySelector('button');
      if (button)
        button.addEventListener('click', () => {
          displayed += 8;
          renderRows();
        });
    }
    container.querySelectorAll('[data-filter]').forEach((button) =>
      button.addEventListener('click', () => {
        const filter = button.dataset.filter;
        selected =
          filter === 'all' ? projects : projects.filter((project) => category(project) === filter);
        displayed = 8;
        container.querySelectorAll('[data-filter]').forEach((tab) => {
          tab.classList.toggle('active', tab === button);
          tab.setAttribute('aria-pressed', String(tab === button));
        });
        renderRows();
      })
    );
    renderRows();
  }
  async function loadDPWHProjects() {
    const container = document.getElementById('dpwh-projects-container');
    if (!container) return;
    container.innerHTML = '<p role="status">Loading DPWH project data…</p>';
    try {
      const response = await fetch('../data/dpwh-projects.json');
      if (!response.ok) throw new Error(`DPWH request failed (${response.status})`);
      renderProjects(container, await response.json());
    } catch (error) {
      console.error('[DPWH projects] Unable to load records:', error);
      container.innerHTML =
        '<p role="status">Project data could not be loaded. Please try again later.</p><p><a href="https://www.dpwh.gov.ph/">Visit the official DPWH website</a></p>';
    }
  }
  if (typeof module !== 'undefined' && module.exports)
    module.exports = { validProject, renderProjects, loadDPWHProjects };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading')
      document.addEventListener('DOMContentLoaded', loadDPWHProjects);
    else loadDPWHProjects();
  }
})();
