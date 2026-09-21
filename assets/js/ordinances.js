/* Better Albay - Ordinance Table JavaScript */

/**
 * Fetches ordinance data from the JSON file
 * @returns {Promise<Array>} Array of ordinance objects
 */
async function fetchOrdinances() {
  try {
    const response = await fetch('../data/ordinances.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data._status === 'draft' || data._status === 'unverified') return [];
    return Array.isArray(data.ordinances)
      ? data.ordinances.filter(
          (record) => record && record._status !== 'draft' && record._status !== 'unverified'
        )
      : [];
  } catch (error) {
    console.error('Error fetching ordinances:', error);
    return [];
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
 * Builds a sortable key from an ordinance number.
 *
 * Albay has used two numbering conventions:
 *   - "YYYY-NN"  the year first, then the sequence within that year (e.g. 2003-17)
 *   - "NNN-YY"   the sequence first, then a two-digit year (e.g. 005-99)
 * Both are normalised to year * 100000 + sequence so the list sorts
 * chronologically even when the two conventions are mixed.
 * @param {string} ordinanceNo - Ordinance number
 * @returns {number} Sort key; higher is newer
 */
function ordinanceSortKey(ordinanceNo) {
  const parts = String(ordinanceNo || '')
    .trim()
    .split('-');
  const first = parseInt(parts[0], 10);
  const second = parseInt(parts[1], 10);
  let year = 0;
  let seq = 0;

  if (String(parts[0]).length === 4 && first >= 1900 && first <= 2199) {
    year = first;
    seq = isNaN(second) ? 0 : second;
  } else if (String(parts[1]).length === 2 && !isNaN(second)) {
    year = second >= 50 ? 1900 + second : 2000 + second;
    seq = isNaN(first) ? 0 : first;
  } else {
    year = isNaN(first) ? 0 : first;
    seq = isNaN(second) ? 0 : second;
  }

  return year * 100000 + seq;
}

/**
 * Sorts ordinances by number in descending order (newest first)
 * @param {Array} ordinances - Array of ordinance objects
 * @returns {Array} Sorted array of ordinances
 */
function sortOrdinancesByNumber(ordinances) {
  return [...ordinances].sort(
    (a, b) => ordinanceSortKey(b.ordinanceNo) - ordinanceSortKey(a.ordinanceNo)
  );
}

/**
 * Formats ordinance number for display
 * @param {string} ordinanceNo - Ordinance number (e.g., "2025-001")
 * @returns {string} Ordinance number as-is
 */
function formatOrdinanceNo(ordinanceNo) {
  return ordinanceNo;
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
 * Renders the ordinance table to the DOM
 * @param {Array} ordinances - Array of ordinance objects
 */
function renderOrdinanceTable(ordinances) {
  const tableBody = document.getElementById('ordinance-table-body');

  if (!tableBody) {
    console.error('Ordinance table body element not found');
    return;
  }

  // Clear existing content
  tableBody.innerHTML = '';

  // Handle empty data
  if (!ordinances || ordinances.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
            <td colspan="4" class="text-center text-muted">
                No Albay ordinance has been recorded from a retrievable source.
            </td>
        `;
    tableBody.appendChild(emptyRow);
    return;
  }

  // Render each ordinance
  ordinances.forEach((ordinance) => {
    // Skip invalid records. A session date is optional: several ordinances are
    // cited in later codes without the source naming the session, and an
    // inferred date would be a fabrication.
    if (!ordinance.ordinanceNo || !ordinance.title) {
      console.warn('Skipping invalid ordinance record:', ordinance);
      return;
    }

    const numberCell = escapeHtml(formatOrdinanceNo(ordinance.ordinanceNo));
    const titleCell =
      escapeHtml(ordinance.title) +
      (ordinance.alsoKnownAs
        ? `<div class="text-muted" style="font-size: 0.8125rem; margin-top: 4px">Also known as: ${escapeHtml(
            ordinance.alsoKnownAs
          )}</div>`
        : '');
    const dateCell = ordinance.sessionDate
      ? escapeHtml(formatSessionDate(ordinance.sessionDate)) +
        (ordinance.session
          ? `<div class="text-muted" style="font-size: 0.8125rem; margin-top: 4px">${escapeHtml(
              ordinance.session
            )}</div>`
          : '')
      : '<span class="text-muted" title="The source cites this ordinance without naming the session">Not published</span>';
    const sourceCell =
      ordinance.sourceUrl && ordinance.sourceLabel
        ? `<a href="${escapeHtml(ordinance.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
            ordinance.sourceLabel
          )} <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i></a>`
        : '<span class="text-muted">Not published</span>';

    const row = document.createElement('tr');
    row.innerHTML = `
            <td data-label="Ordinance No.">${numberCell}</td>
            <td data-label="Title">${titleCell}</td>
            <td data-label="Session Date">${dateCell}</td>
            <td data-label="Source">${sourceCell}</td>
        `;
    tableBody.appendChild(row);
  });
}

/**
 * Main initialization function for the ordinance table
 */
async function initOrdinanceTable() {
  try {
    const ordinances = await fetchOrdinances();
    const sortedOrdinances = sortOrdinancesByNumber(ordinances);
    renderOrdinanceTable(sortedOrdinances);
  } catch (error) {
    console.error('Error initializing ordinance table:', error);
    const tableBody = document.getElementById('ordinance-table-body');
    if (tableBody) {
      tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted">
                        Unable to load ordinances. Please try again later.
                    </td>
                </tr>
            `;
    }
  }
}

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initOrdinanceTable);
}

// Export functions for testing (if module system is available)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    fetchOrdinances,
    escapeHtml,
    ordinanceSortKey,
    sortOrdinancesByNumber,
    formatOrdinanceNo,
    formatSessionDate,
    renderOrdinanceTable,
    initOrdinanceTable,
  };
}
