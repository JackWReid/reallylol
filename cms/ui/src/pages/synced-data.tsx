import { signal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { api } from "../lib/api";
import { getParam, setParams } from "../lib/url-state";

type Tab = "books" | "films" | "links";

interface Book {
  title: string;
  author: string;
  date_updated: string;
  image_url: string | null;
  hardcover_url: string | null;
}

interface Film {
  name: string;
  year: string | null;
  date_updated: string;
}

interface Link {
  title: string;
  url: string;
  date: string;
  excerpt: string | null;
  cover: string | null;
  tags: string[];
}

const activeTab = signal<Tab>("books");
const bookShelf = signal("read");
const filmList = signal("watched");
const books = signal<Book[]>([]);
const films = signal<Film[]>([]);
const links = signal<Link[]>([]);
const loading = signal(false);
const syncing = signal(false);
const uploading = signal(false);
const syncResult = signal("");
const lastSynced = signal<string | null>(null);

function syncToUrl() {
  const updates: Record<string, string | null> = { tab: activeTab.value };
  if (activeTab.value === "books") updates.shelf = bookShelf.value;
  else updates.shelf = null;
  if (activeTab.value === "films") updates.list = filmList.value;
  else updates.list = null;
  setParams(updates);
}

async function loadBooks(shelf: string) {
  loading.value = true;
  bookShelf.value = shelf;
  syncToUrl();
  try {
    const data = (await api.get(`/api/data/books?shelf=${shelf}`)) as Book[];
    books.value = data;
    if (data.length > 0) lastSynced.value = data[0].date_updated;
  } finally {
    loading.value = false;
  }
}

async function loadFilms(list: string) {
  loading.value = true;
  filmList.value = list;
  syncToUrl();
  try {
    const data = (await api.get(`/api/data/films?list=${list}`)) as Film[];
    films.value = data;
    if (data.length > 0) lastSynced.value = data[0].date_updated;
  } finally {
    loading.value = false;
  }
}

async function loadLinks() {
  loading.value = true;
  syncToUrl();
  try {
    const data = (await api.get("/api/data/links")) as Link[];
    links.value = data;
    if (data.length > 0) lastSynced.value = data[0].date;
  } finally {
    loading.value = false;
  }
}

function switchTab(tab: Tab) {
  activeTab.value = tab;
  syncResult.value = "";
  if (tab === "books") loadBooks(bookShelf.value);
  else if (tab === "films") loadFilms(filmList.value);
  else loadLinks();
}

async function handleSync() {
  syncing.value = true;
  syncResult.value = "";
  try {
    if (activeTab.value === "books") {
      const res = (await api.post("/api/sync/books/fetch", {})) as any;
      const total = Object.values(res.results as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
      syncResult.value = `Synced ${total} books (${Object.entries(res.results).map(([k, v]) => `${k}: ${v}`).join(", ")})`;
      loadBooks(bookShelf.value);
    } else if (activeTab.value === "links") {
      const res = (await api.post("/api/sync/links/fetch", {})) as any;
      syncResult.value = `Synced ${res.count} links`;
      loadLinks();
    }
  } catch (e: unknown) {
    syncResult.value = `Sync failed: ${e instanceof Error ? e.message : String(e)}`;
  } finally {
    syncing.value = false;
  }
}

function bookMedialogUrl(b: Book): string {
  const meta = JSON.stringify({ book_author: b.author, media_image: b.image_url ?? "" });
  const p: Record<string, string> = { type: "post", title: b.title, tags: "medialog", meta };
  if (b.date_updated) p.date = `${b.date_updated}T12:00`;
  return `/content/new?${new URLSearchParams(p)}`;
}

function filmMedialogUrl(f: Film): string {
  const meta = JSON.stringify({ movie_released: f.year ?? "" });
  const p: Record<string, string> = { type: "post", title: f.name, tags: "medialog", meta };
  if (f.date_updated) p.date = `${f.date_updated}T12:00`;
  return `/content/new?${new URLSearchParams(p)}`;
}

async function handleLetterboxdUpload(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  input.value = "";

  uploading.value = true;
  syncResult.value = "";
  try {
    const form = new FormData();
    form.append("file", file);
    const res = await api.upload("/api/sync/films/letterboxd", form) as any;
    const parts = Object.entries(res.results as Record<string, number>)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    syncResult.value = `Imported from Letterboxd (${parts})`;
    loadFilms(filmList.value);
  } catch (e: unknown) {
    syncResult.value = `Upload failed: ${e instanceof Error ? e.message : String(e)}`;
  } finally {
    uploading.value = false;
  }
}

function BooksTable() {
  return (
    <div>
      <div class="sub-tab-group">
        {["read", "reading", "toread"].map((shelf) => (
          <button
            key={shelf}
            class={`sub-tab ${bookShelf.value === shelf ? "active" : ""}`}
            onClick={() => loadBooks(shelf)}
          >
            {shelf === "toread" ? "To Read" : shelf.charAt(0).toUpperCase() + shelf.slice(1)}
          </button>
        ))}
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Author</th>
            <th style="width:100px">Updated</th>
            <th style="width:60px"></th>
          </tr>
        </thead>
        <tbody>
          {books.value.map((b) => (
            <tr key={`${b.title}-${b.author}`}>
              <td>
                <a href={bookMedialogUrl(b)}>{b.title}</a>
              </td>
              <td>{b.author}</td>
              <td class="date-col">{b.date_updated}</td>
              <td><a href={bookMedialogUrl(b)} class="library-create-link">+ Review</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FilmsTable() {
  return (
    <div>
      <div class="sub-tab-group">
        {["watched", "towatch"].map((list) => (
          <button
            key={list}
            class={`sub-tab ${filmList.value === list ? "active" : ""}`}
            onClick={() => loadFilms(list)}
          >
            {list === "towatch" ? "To Watch" : "Watched"}
          </button>
        ))}
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Film</th>
            <th style="width:70px">Year</th>
            <th style="width:100px">Updated</th>
            <th style="width:60px"></th>
          </tr>
        </thead>
        <tbody>
          {films.value.map((f) => (
            <tr key={`${f.name}-${f.year}`}>
              <td><a href={filmMedialogUrl(f)}>{f.name}</a></td>
              <td class="date-col">{f.year}</td>
              <td class="date-col">{f.date_updated}</td>
              <td><a href={filmMedialogUrl(f)} class="library-create-link">+ Review</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LinksTable() {
  return (
    <table class="data-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Tags</th>
          <th style="width:100px">Date</th>
        </tr>
      </thead>
      <tbody>
        {links.value.map((l) => (
          <tr key={l.url}>
            <td>
              <a href={l.url} target="_blank" rel="noopener">{l.title}</a>
              {l.excerpt && (
                <div style="color:var(--text-muted);font-size:0.78rem;margin-top:0.15rem;max-width:500px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                  {l.excerpt}
                </div>
              )}
            </td>
            <td>
              <div style="display:flex;gap:0.25rem;flex-wrap:wrap">
                {l.tags.map((t) => (
                  <span key={t} class="tag-chip">{t}</span>
                ))}
              </div>
            </td>
            <td class="date-col">{l.date}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function SyncedData(_props: { path?: string }) {
  useEffect(() => {
    const tab = getParam("tab", "books") as Tab;
    const shelf = getParam("shelf", "read");
    const list = getParam("list", "watched");
    activeTab.value = tab;
    bookShelf.value = shelf;
    filmList.value = list;

    if (tab === "books") loadBooks(shelf);
    else if (tab === "films") loadFilms(list);
    else loadLinks();
  }, []);

  const canSync = activeTab.value === "books" || activeTab.value === "links";

  return (
    <div>
      <div class="page-header">
        <h1 class="page-title">Library</h1>
        <div class="page-header-actions">
          {lastSynced.value && (
            <span class="latest-sync">Latest entry: {lastSynced.value}</span>
          )}
          {activeTab.value === "films" && (
            <label class={`btn btn-secondary${uploading.value ? " disabled" : ""}`} style="cursor:pointer">
              {uploading.value ? "Importing..." : "Upload Letterboxd ZIP"}
              <input
                type="file"
                accept=".zip"
                style="display:none"
                disabled={uploading.value}
                onChange={handleLetterboxdUpload}
              />
            </label>
          )}
          {canSync && (
            <button
              class="btn btn-secondary"
              onClick={handleSync}
              disabled={syncing.value}
            >
              {syncing.value ? "Syncing..." : `Sync ${activeTab.value}`}
            </button>
          )}
        </div>
      </div>

      {syncResult.value && (
        <div class={syncResult.value.startsWith("Sync failed") ? "error-banner" : "success-banner"}>
          {syncResult.value}
        </div>
      )}

      <div class="tab-bar">
        {(["books", "films", "links"] as Tab[]).map((tab) => (
          <button
            key={tab}
            class={`tab-btn ${activeTab.value === tab ? "active" : ""}`}
            onClick={() => switchTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading.value ? (
        <p class="loading">Loading...</p>
      ) : (
        <div>
          {activeTab.value === "books" && <BooksTable />}
          {activeTab.value === "films" && <FilmsTable />}
          {activeTab.value === "links" && <LinksTable />}

          <p class="data-count">
            {activeTab.value === "books" && `${books.value.length} books`}
            {activeTab.value === "films" && `${films.value.length} films`}
            {activeTab.value === "links" && `${links.value.length} links`}
          </p>
        </div>
      )}
    </div>
  );
}
