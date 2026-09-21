/* Better Albay - Resolution Table JavaScript */

/**
 * Fetches resolution data from the JSON file
 * @returns {Promise<Array>} Array of resolution objects
 */
async function fetchResolutions() {
  try {
    const response = await fetch('../data/resolutions.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data._status === 'draft' || data._status === 'unverified') return [];
    return Array.isArray(data.resolutions)
      ? data.resolutions.filter(
          (record) => record && record._status !== 'draft' && record._status !== 'unverified'
        )
      : [];
  } catch (error) {
    console.error('Error fetching resolutions:', error);
    return [];
  }
}

/**
 * Extracts the year segment from a resolution number
 * Resolution format: "XXX-YYYY-SS" (sequence-year-session)
 * @param {string} resolutionNo - Resolution number (e.g., "246-2025-11")
 * @returns {number} The year (e.g., 2025)
 */
function getResolutionYear(resolutionNo) {
  return parseInt(resolutionNo.split('-')[1], 10);
}

/**
 * Sorts resolutions by year, then sequence number, in descending order (newest first)
 * Resolution format: "XXX-YYYY-SS" (sequence-year-session)
 * @param {Array} resolutions - Array of resolution objects
 * @returns {Array} Sorted array of resolutions
 */
function sortResolutionsByNumber(resolutions) {
  return [...resolutions].sort((a, b) => {
    const [numA, yearA] = a.resolutionNo.split('-');
    const [numB, yearB] = b.resolutionNo.split('-');
    if (yearA !== yearB) {
      return parseInt(yearB, 10) - parseInt(yearA, 10);
    }
    return parseInt(numB, 10) - parseInt(numA, 10);
  });
}

/**
 * Formats resolution number for display
 * @param {string} resolutionNo - Resolution number (e.g., "2025-001")
 * @returns {string} Resolution number as-is
 */
function formatResolutionNo(resolutionNo) {
  return resolutionNo;
}

/**
 * Formats session date for display
 * @param {string} dateString - ISO date string (e.g., "2025-01-06")
 * @returns {string} Formatted date (e.g., "January 6, 2025")
 */
function formatSessionDate(dateString) {
  try {
    const date = new Date(dateString + 'T00:00:00');
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    console.warn('Invalid date format:', dateString);
    return dateString;
  }
}

/**
 * Escapes a value for safe insertion into HTML.
 * @param {*} value - Any value
 * @returns {string} HTML-escaped string
 */
function escapeHtml(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Renders the resolution table to the DOM.
 *
 * There is a single table on purpose. The page previously split records into
 * hardcoded 2026 and 2025 tables, which silently discarded any resolution
 * numbered outside those two years.
 * @param {Array} resolutions - Array of resolution objects
 * @param {string} [tableBodyId] - The id of the tbody element to populate
 */
function renderResolutionTable(resolutions, tableBodyId = 'resolution-table-body') {
  const tableBody = document.getElementById(tableBodyId);

  if (!tableBody) {
    // Not an error: the table is optional on pages that only show the note.
    return;
  }

  // Clear existing content
  tableBody.innerHTML = '';

  // Handle empty data
  if (!resolutions || resolutions.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
            <td colspan="4" class="text-center text-muted">
                No Albay resolution has been recorded from a retrievable source.
            </td>
        `;
    tableBody.appendChild(emptyRow);
    return;
  }

  // Render each resolution
  resolutions.forEach((resolution) => {
    // A session date is optional: where the source cites a resolution without
    // naming the session, an inferred date would be a fabrication.
    if (!resolution.resolutionNo || !resolution.title) {
      console.warn('Skipping invalid resolution record:', resolution);
      return;
    }

    const dateCell = resolution.sessionDate
      ? escapeHtml(formatSessionDate(resolution.sessionDate)) +
        (resolution.session
          ? `<div class="text-muted" style="font-size: 0.8125rem; margin-top: 4px">${escapeHtml(
              resolution.session
            )}</div>`
          : '')
      : '<span class="text-muted">Not published</span>';
    const sourceCell =
      resolution.sourceUrl && resolution.sourceLabel
        ? `<a href="${escapeHtml(resolution.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
            resolution.sourceLabel
          )} <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i></a>`
        : '<span class="text-muted">Not published</span>';

    const row = document.createElement('tr');
    row.innerHTML = `
            <td data-label="Resolution">${escapeHtml(
              formatResolutionNo(resolution.resolutionNo)
            )}</td>
            <td data-label="Title">${escapeHtml(resolution.title)}</td>
            <td data-label="Session Date">${dateCell}</td>
            <td data-label="Source">${sourceCell}</td>
        `;
    tableBody.appendChild(row);
  });
}

/**
 * Main initialization function for the resolution table
 */
async function initResolutionTable() {
  try {
    const resolutions = await fetchResolutions();
    renderResolutionTable(sortResolutionsByNumber(resolutions));
  } catch (error) {
    console.error('Error initializing resolution table:', error);
    const tableBody = document.getElementById('resolution-table-body');
    if (tableBody) {
      tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted">
                        Unable to load resolutions. Please try again later.
                    </td>
                </tr>
            `;
    }
  }
}

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initResolutionTable);
}

// Export functions for testing (if module system is available)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    fetchResolutions,
    escapeHtml,
    getResolutionYear,
    sortResolutionsByNumber,
    formatResolutionNo,
    formatSessionDate,
    renderResolutionTable,
    initResolutionTable,
  };
}
