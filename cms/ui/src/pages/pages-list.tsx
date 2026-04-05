import { useEffect } from "preact/hooks";
import { signal } from "@preact/signals";
import { api } from "../lib/api";
import type { ContentItem } from "../../../../shared/types";

const pages = signal<ContentItem[]>([]);
const loading = signal(true);

function fetchPages() {
  loading.value = true;
  (api.get("/api/content?type=page&limit=50&sort=title&order=asc") as Promise<any>).then((data) => {
    pages.value = data.items;
    loading.value = false;
  });
}

function pageUrl(item: ContentItem): string {
  const meta = item.meta as Record<string, unknown>;
  return (meta.url as string) ?? `/${item.type}/${item.slug}`;
}

export function PagesList(_props: { path?: string }) {
  useEffect(() => {
    fetchPages();
  }, []);

  return (
    <div>
      <div class="page-header">
        <h1 class="page-title">Pages</h1>
        <a href="/content/new?type=page" class="btn btn-primary">+ New Page</a>
      </div>

      {loading.value ? (
        <p class="loading">Loading...</p>
      ) : pages.value.length === 0 ? (
        <p class="empty">No static pages yet.</p>
      ) : (
        <div class="content-list">
          {pages.value.map((item) => (
            <a href={`/content/edit/${item.type}/${item.slug}`} class="content-row">
              <span class="content-row-title">{item.title}</span>
              {item.status === "draft" && <span class="draft-badge">Draft</span>}
              <span class="content-row-url">{pageUrl(item)}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
