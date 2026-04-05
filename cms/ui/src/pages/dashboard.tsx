import { useEffect } from "preact/hooks";
import { signal } from "@preact/signals";
import { api } from "../lib/api";
import type { ContentItem } from "../../../../shared/types";

const recentContent = signal<ContentItem[]>([]);
const loading = signal(true);

interface Stats {
  content: Record<string, number>;
  books: number;
  films: number;
  links: number;
  last_build_triggered: string | null;
  last_books_sync: string | null;
  last_links_sync: string | null;
}
const stats = signal<Stats | null>(null);

const TYPE_ICONS: Record<string, string> = {
  post: "\u270E",
  note: "\uD83D\uDCAC",
  photo: "\uD83D\uDCF7",
  highlight: "\uD83D\uDCCE",
};

export function Dashboard() {
  useEffect(() => {
    loading.value = true;
    Promise.all([
      api.get("/api/content?limit=10&sort=updated_at"),
      api.get("/api/data/stats"),
    ]).then(([contentData, statsData]: any[]) => {
      recentContent.value = contentData.items;
      stats.value = statsData;
    }).finally(() => {
      loading.value = false;
    });
  }, []);

  function formatDate(iso: string | null): string {
    if (!iso) return "Never";
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div>
      <h1 class="page-title mb-md">Dashboard</h1>

      <div class="quick-actions">
        {["post", "note", "photo", "highlight"].map((type) => (
          <a href={`/content/new?type=${type}`} class="quick-action">
            {TYPE_ICONS[type]} + {type}
          </a>
        ))}
      </div>

      {stats.value && (
        <div class="stats-grid">
          <div class="stat-section">
            <h3 class="stat-section-title">Content</h3>
            <div class="stat-row">
              {(["post", "note", "photo", "highlight", "page"] as const).map((type) => (
                <div class="stat-item" key={type}>
                  <span class="stat-value">{stats.value!.content[type] ?? 0}</span>
                  <span class="stat-label">{type === "post" ? "posts" : type === "photo" ? "photos" : `${type}s`}</span>
                </div>
              ))}
            </div>
          </div>
          <div class="stat-section">
            <h3 class="stat-section-title">Library</h3>
            <div class="stat-row">
              <div class="stat-item">
                <span class="stat-value">{stats.value!.books}</span>
                <span class="stat-label">books</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{stats.value!.films}</span>
                <span class="stat-label">films</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{stats.value!.links}</span>
                <span class="stat-label">links</span>
              </div>
            </div>
          </div>
          <div class="stat-section">
            <h3 class="stat-section-title">Activity</h3>
            <div class="stat-row">
              <div class="stat-item">
                <span class="stat-value stat-value-sm">{formatDate(stats.value!.last_build_triggered)}</span>
                <span class="stat-label">last build</span>
              </div>
              <div class="stat-item">
                <span class="stat-value stat-value-sm">{formatDate(stats.value!.last_books_sync)}</span>
                <span class="stat-label">books sync</span>
              </div>
              <div class="stat-item">
                <span class="stat-value stat-value-sm">{formatDate(stats.value!.last_links_sync)}</span>
                <span class="stat-label">links sync</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <h2 class="mb-sm" style="font-size:1.1rem">Recently Updated</h2>
      {loading.value ? (
        <p class="loading">Loading...</p>
      ) : (
        <div class="content-list">
          {recentContent.value.map((item) => (
            <a href={`/content/edit/${item.type}/${item.slug}`} class="content-row">
              <span class={`content-row-type type-${item.type}`}>{TYPE_ICONS[item.type] ?? ""} {item.type}</span>
              <span class="content-row-title">{item.title}</span>
              <span class="content-row-meta">
                {item.status === "draft" && <span class="draft-badge">Draft</span>}
                {item.date?.slice(0, 10)}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
