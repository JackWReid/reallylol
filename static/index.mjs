const bookUrls = {
    done: '',
    doing: '',
    todo: '/.netlify/functions/fetch-books?status=todo',
};

const bookHost = '/.netlify/functions/fetch-books';

const hour = 3600;
const expired = dateStr => dateStr > (new Date().getTime());
const expiry = () => new Date().getTime() + hour;

const statusMap = {
  reading: 'doing',
  read: 'done',
  toread: 'todo',  
};

function setBookCache(data) {
    localStorage.setItem(data.status, JSON.stringify({
        items: data.items,
        status: data.items,
        expiry: expiry(),
    }));
}

function getBookCache(status) {
    const raw = localStorage.getItem(status);

    if (!raw) {
        return null;
    }
    
    const json = JSON.parse(raw);

    if (expired(json.expiry)) {
        localStorage.removeItem(status);
        return null;
    }

    return json;
}

async function fetchBooks(status) {
    return fetch(`${bookHost}?status=${status}`)
    .then(res => res.json())
    .then(json => {
        return json;
    });
}

async function loadBooks(status) {
    const cachedBooks = getBookCache(status);

    if (cachedBooks) {
        return cachedBooks;
    }

    const fetchedBooks =  await fetchBooks(status);
    setBookCache(fetchedBooks);

    return fetchedBooks;
}

function fillBookTables() {
    const bookTableEls = document.querySelectorAll('[data-media-table]');
    bookTableEls.forEach(initBookTable);
}

async function initBookTable(el) {
    const status = statusMap[el.dataset.mediaTable];
    el.dataset.status = 'loading';
    const bookData = await loadBooks(status);
    const tBody = el.querySelector('tbody');
    tBody.innerHTML = '';

    for (const book of bookData.items) {
        const trEl = document.createElement('tr');
        const row = `
            <td class="media-table__date">${new Date(book.date).toLocaleDateString()}</td>
            <td class="media-table__title">${book.title}</td>
            <td class="media-table__author">${book.author}</td>
        `;
        trEl.innerHTML = row;
        tBody.appendChild(trEl);
    }
    
    el.dataset.status = 'done';
}

fillBookTables();