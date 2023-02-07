function filterTable(tableEl, year) {
  const rows = tableEl.querySelector('tbody').children; 
  const filteredRows = [...rows].filter(r => {
    return r.querySelector('.media-table__date').innerText.startsWith(year);
  });
  return filteredRows;
}

function writeFilteredTable(tableEl, rows) {
  const tableBody = tableEl.querySelector('tbody');
  tableBody.innerHTML = '';
  rows.forEach(r => tableBody.appendChild(r));
}

const mediaTableEl = document.querySelector('.media-table');
const yearMovies = filterTable(mediaTableEl, 2023);
writeFilteredTable(mediaTableEl, yearMovies);

