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

export type LibraryTab = "books-read" | "books-reading" | "books-toread" | "films-watched" | "films-towatch";

interface LibraryProps {
  activeTab: LibraryTab;
  items: TimelineItem[];
}

export function LibraryTimeline({ activeTab, items }: LibraryProps) {
  const isBooks = activeTab.startsWith("books");
  const isFlat = activeTab === "books-reading" || activeTab === "books-toread" || activeTab === "films-towatch";
  const groups = isFlat ? [] : groupByTimeline(items);
  const flatItems = isFlat ? [...items].sort((a, b) => a.title.localeCompare(b.title)) : [];

  return (
    <div class="library">
      <div class="section-tabs">
        <a href="/books/read" class={activeTab === "books-read" ? "active" : ""}>Read</a>
        <a href="/books/reading" class={activeTab === "books-reading" ? "active" : ""}>Reading</a>
        <a href="/books/toread" class={activeTab === "books-toread" ? "active" : ""}>To Read</a>
        <span class="tab-divider" />
        <a href="/films/watched" class={activeTab === "films-watched" ? "active" : ""}>Watched</a>
        <a href="/films/towatch" class={activeTab === "films-towatch" ? "active" : ""}>To Watch</a>
      </div>

      {isFlat ? (
        <div class="timeline">
          <p class="timeline__flat-count">{flatItems.length} {isBooks ? "books" : "films"}</p>
          {flatItems.map((item, i) => (
            <div class="timeline__item" key={`${item.title}-${i}`}>
              <span class="timeline__title">{item.title}</span>
              <span class="timeline__creator">
                {item.creator}{item.year ? ` (${item.year})` : ""}
              </span>
            </div>
          ))}
        </div>
      ) : (
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
      )}
    </div>
  );
}
