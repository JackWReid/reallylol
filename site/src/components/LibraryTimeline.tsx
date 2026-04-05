import { useState } from "preact/hooks";

interface TimelineItem {
  title: string;
  creator: string;
  date: string;
  year?: string; // release year for films
}

interface MonthGroup {
  label: string;
  count: number;
  items: TimelineItem[];
}

interface YearGroup {
  year: number;
  months: MonthGroup[];
}

function groupByTimeline(items: TimelineItem[]): YearGroup[] {
  const years = new Map<number, Map<string, TimelineItem[]>>();

  for (const item of items) {
    const d = new Date(item.date);
    const y = d.getFullYear();
    const m = d.toLocaleDateString("en-GB", { month: "long" });

    if (!years.has(y)) years.set(y, new Map());
    const months = years.get(y)!;
    if (!months.has(m)) months.set(m, []);
    months.get(m)!.push(item);
  }

  return Array.from(years.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, months]) => ({
      year,
      months: Array.from(months.entries()).map(([label, items]) => ({
        label,
        count: items.length,
        items,
      })),
    }));
}

type Tab = "books-read" | "books-reading" | "books-toread" | "films-watched" | "films-towatch";

interface LibraryData {
  booksRead: TimelineItem[];
  booksReading: TimelineItem[];
  booksToRead: TimelineItem[];
  filmsWatched: TimelineItem[];
  filmsToWatch: TimelineItem[];
  bookCount: number;
  authorCount: number;
  filmCount: number;
}

export function LibraryTimeline({ data }: { data: LibraryData }) {
  const [tab, setTab] = useState<Tab>("books-read");

  const tabData: Record<Tab, TimelineItem[]> = {
    "books-read": data.booksRead,
    "books-reading": data.booksReading,
    "books-toread": data.booksToRead,
    "films-watched": data.filmsWatched,
    "films-towatch": data.filmsToWatch,
  };

  const items = tabData[tab];
  const groups = groupByTimeline(items);
  const isBooks = tab.startsWith("books");

  return (
    <div class="library">
      <div class="section-tabs">
        <a
          href="#"
          class={tab === "books-read" ? "active" : ""}
          onClick={(e) => { e.preventDefault(); setTab("books-read"); }}
        >Read</a>
        <a
          href="#"
          class={tab === "books-reading" ? "active" : ""}
          onClick={(e) => { e.preventDefault(); setTab("books-reading"); }}
        >Reading</a>
        <a
          href="#"
          class={tab === "books-toread" ? "active" : ""}
          onClick={(e) => { e.preventDefault(); setTab("books-toread"); }}
        >To Read</a>
        <span class="tab-divider" />
        <a
          href="#"
          class={tab === "films-watched" ? "active" : ""}
          onClick={(e) => { e.preventDefault(); setTab("films-watched"); }}
        >Watched</a>
        <a
          href="#"
          class={tab === "films-towatch" ? "active" : ""}
          onClick={(e) => { e.preventDefault(); setTab("films-towatch"); }}
        >To Watch</a>
      </div>

      <div class="timeline">
        {groups.map((yearGroup) => (
          <div class="timeline__year" key={yearGroup.year}>
            <h2 class="timeline__year-label">{yearGroup.year}</h2>
            {yearGroup.months.map((month) => (
              <div class="timeline__month" key={month.label}>
                <h3 class="timeline__month-label">
                  {month.label} — {month.count} {isBooks ? (month.count === 1 ? "book" : "books") : (month.count === 1 ? "film" : "films")}
                </h3>
                {month.items.map((item, i) => (
                  <div class="timeline__item" key={`${item.title}-${i}`}>
                    <span class="timeline__title">{item.title}</span>
                    <span class="timeline__creator">
                      {item.creator}{item.year ? ` (${item.year})` : ""}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div class="library__stats">
        {data.bookCount.toLocaleString()} books · {data.authorCount.toLocaleString()} authors · {data.filmCount.toLocaleString()} films
      </div>
    </div>
  );
}
