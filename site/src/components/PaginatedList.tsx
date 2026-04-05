import { useState } from "preact/hooks";

const PER_PAGE = 24;

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPage: (page: number) => void;
}

function PaginationNav({ currentPage, totalPages, onPage }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <nav class="page-nav">
      <div class="prev-wrapper">
        {currentPage > 1 ? (
          <a href="#" onClick={(e) => { e.preventDefault(); onPage(currentPage - 1); }}>Back</a>
        ) : (
          <span>Back</span>
        )}
      </div>
      <span class="page-count">{currentPage} of {totalPages}</span>
      <div class="next-wrapper">
        {currentPage < totalPages ? (
          <a href="#" onClick={(e) => { e.preventDefault(); onPage(currentPage + 1); }}>Next</a>
        ) : (
          <span>Next</span>
        )}
      </div>
    </nav>
  );
}

// Book grid
interface Book {
  title: string;
  author: string;
  date_updated: string;
  image_url?: string;
  hardcover_url?: string;
}

export function BookGrid({ books }: { books: Book[] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(books.length / PER_PAGE);
  const visible = books.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function go(p: number) {
    setPage(p);
    window.scrollTo(0, 0);
  }

  return (
    <>
      <ul class="book-grid book-grid--fullwidth">
        {visible.map((book) => (
          <li class="book-card" key={`${book.title}-${book.author}`}>
            <div class="book-card__cover-frame">
              <img
                src={book.image_url || "/img/layout/no-book-cover.jpg"}
                alt={`Cover of ${book.title}`}
                loading="lazy"
                class="book-card__cover"
              />
            </div>
            <div class="book-card__meta">
              <h3 class="book-card__title">{book.title}</h3>
              <div class="book-card__author">{book.author}</div>
              {book.date_updated && (
                <div class="book-card__date">
                  {new Date(book.date_updated).toLocaleDateString("en-GB", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      <PaginationNav currentPage={page} totalPages={totalPages} onPage={go} />
    </>
  );
}

// Film table
interface Film {
  name: string;
  year: string;
  date_updated: string;
}

export function FilmTable({ films, showDate = true }: { films: Film[]; showDate?: boolean }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(films.length / PER_PAGE);
  const visible = films.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function go(p: number) {
    setPage(p);
    window.scrollTo(0, 0);
  }

  return (
    <>
      <table class="media-table media-table--film">
        <thead>
          <tr>
            {showDate && <th>Date</th>}
            <th>Title</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((film) => (
            <tr key={`${film.name}-${film.year}`}>
              {showDate && <td class="media-table__date">{film.date_updated?.slice(0, 10)}</td>}
              <td class="media-table__title">{film.name}{film.year ? ` (${film.year})` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <PaginationNav currentPage={page} totalPages={totalPages} onPage={go} />
    </>
  );
}

// Links list
interface Link {
  title: string;
  url: string;
  date: string;
  excerpt?: string;
  tags?: string[];
  cover?: string;
}

export function LinkList({ links }: { links: Link[] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(links.length / PER_PAGE);
  const visible = links.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function go(p: number) {
    setPage(p);
    window.scrollTo(0, 0);
  }

  return (
    <>
      <ul class="saved-links-list">
        {visible.map((link) => (
          <li key={link.url}>
            <article class="saved-link">
              <header class="saved-link__header">
                <a href={link.url} target="_blank" rel="noopener" class="saved-link__title">
                  {link.title}
                </a>
              </header>
              <p class="saved-link__date">
                <time datetime={link.date}>
                  {new Date(link.date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </time>
              </p>
              {link.excerpt && (
                <p class="saved-link__excerpt">{link.excerpt}</p>
              )}
            </article>
          </li>
        ))}
      </ul>
      <PaginationNav currentPage={page} totalPages={totalPages} onPage={go} />
    </>
  );
}
