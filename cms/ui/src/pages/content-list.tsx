import { useEffect } from "preact/hooks";
import { signal, computed } from "@preact/signals";
import { api } from "../lib/api";
import { getParam, getParamInt, setParams } from "../lib/url-state";
import type { ContentItem } from "../../../../shared/types";

const items = signal<ContentItem[]>([]);
const total = signal(0);
const page = signal(1);
const typeFilter = signal("");
const statusFilter = signal("");
const sortField = signal("date");
const sortOrder = signal("desc");
const loading = signal(true);

// Content types shown here — page type is shown in /pages
const TYPES = ["", "post", "note", "photo", "highlight"];
const TYPE_ICONS: Record<string, string> = {
  post: "\u270E",       // ✎ pen
  note: "\uD83D\uDCAC", // 💬 speech bubble
  photo: "\uD83D\uDCF7", // 📷 camera
  highlight: "\uD83D\uDCCE", // 📎 paperclip
};
const SORT_OPTIONS = [
  { value: "date", label: "Date" },
  { value: "updated_at", label: "Updated" },
  { value: "created_at", label: "Created" },
  { value: "title", label: "Title" },
];
const LIMIT = 30;

function syncFromUrl() {
  typeFilter.value = getParam("type");
  statusFilter.value = getParam("status");
  sortField.value = getParam("sort", "date");
  sortOrder.value = getParam("order", "desc");
  page.value = getParamInt("page", 1);
}

function syncToUrl() {
  setParams({
    type: typeFilter.value || null,
    status: statusFilter.value || null,
    sort: sortField.value !== "date" ? sortField.value : null,
    order: sortOrder.value !== "desc" ? sortOrder.value : null,
    page: page.value > 1 ? page.value : null,
  });
}

function fetchContent() {
  loading.value = true;
  syncToUrl();
  const params = new URLSearchParams();
  params.set("page", String(page.value));
  params.set("limit", String(LIMIT));
  params.set("sort", sortField.value);
  params.set("order", sortOrder.value);
  if (typeFilter.value) {
    params.set("type", typeFilter.value);
  } else {
    params.set("exclude_types", "page");
  }
  if (statusFilter.value) params.set("status", statusFilter.value);

  api.get(`/api/content?${params}`).then((data: any) => {
    items.value = data.items;
    total.value = data.total;
    loading.value = false;
  });
}

function resetAndFetch() {
  page.value = 1;
  fetchContent();
}

export function ContentList() {
  useEffect(() => {
    syncFromUrl();
    fetchContent();
  }, []);

  const totalPages = computed(() => Math.ceil(total.value / LIMIT));

  return (
    <div>
      <div class="page-header">
        <h1 class="page-title">Content</h1>
        <a href="/content/new" class="btn btn-primary">+ New</a>
      </div>

      <div class="filter-bar">
        <select
          value={typeFilter.value}
          onChange={(e) => { typeFilter.value = (e.target as HTMLSelectElement).value; resetAndFetch(); }}
          class="select"
          style="width:auto"
        >
          <option value="">All types</option>
          {TYPES.filter(Boolean).map((t) => (
            <option value={t}>{t}</option>
          ))}
        </select>
        <select
          value={statusFilter.value}
          onChange={(e) => { statusFilter.value = (e.target as HTMLSelectElement).value; resetAndFetch(); }}
          class="select"
          style="width:auto"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <select
          value={sortField.value}
          onChange={(e) => { sortField.value = (e.target as HTMLSelectElement).value; resetAndFetch(); }}
          class="select"
          style="width:auto"
        >
          {SORT_OPTIONS.map((o) => (
            <option value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          onClick={() => { sortOrder.value = sortOrder.value === "desc" ? "asc" : "desc"; resetAndFetch(); }}
          class="btn btn-ghost btn-sm"
          title={sortOrder.value === "desc" ? "Descending" : "Ascending"}
        >
          {sortOrder.value === "desc" ? "\u2193" : "\u2191"}
        </button>
        <span class="count">{total.value} items</span>
      </div>

      {loading.value ? (
        <p class="loading">Loading...</p>
      ) : (
        <div class="content-list">
          {items.value.map((item) => (
            <a href={`/content/edit/${item.type}/${item.slug}`} class="content-row">
              <span class={`content-row-type type-${item.type}`}>{TYPE_ICONS[item.type] ?? ""} {item.type}</span>
              <span class="content-row-title">{item.title}</span>
              {item.tags.length > 0 && (
                <span class="content-row-tags">{item.tags.join(", ")}</span>
              )}
              <span class="content-row-meta">
                {item.status === "draft" && <span class="draft-badge">Draft</span>}
                {item.date?.slice(0, 10)}
              </span>
            </a>
          ))}
        </div>
      )}

      {totalPages.value > 1 && (
        <div class="pagination">
          <button
            disabled={page.value <= 1}
            onClick={() => { page.value--; fetchContent(); }}
            class="btn btn-secondary btn-sm"
          >
            Prev
          </button>
          <span class="pagination-info">{page.value} / {totalPages.value}</span>
          <button
            disabled={page.value >= totalPages.value}
            onClick={() => { page.value++; fetchContent(); }}
            class="btn btn-secondary btn-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
