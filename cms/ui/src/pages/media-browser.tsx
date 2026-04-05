import { useEffect, useRef } from "preact/hooks";
import { signal } from "@preact/signals";
import { api } from "../lib/api";
import { getParam, getParamInt, setParams } from "../lib/url-state";
import type { MediaItem } from "../../../../shared/types";

interface MediaItemWithRefs extends MediaItem {
  content_refs: Array<{ type: string; slug: string; title: string }>;
}

const items = signal<MediaItemWithRefs[]>([]);
const total = signal(0);
const page = signal(1);
const kindFilter = signal("");
const loading = signal(true);
const uploading = signal(false);

const MEDIA_URL = "https://media.really.lol";
const LIMIT = 60;

function syncToUrl() {
  setParams({
    kind: kindFilter.value || null,
    page: page.value > 1 ? page.value : null,
  });
}

function fetchMedia() {
  loading.value = true;
  syncToUrl();
  const params = new URLSearchParams();
  params.set("page", String(page.value));
  params.set("limit", String(LIMIT));
  if (kindFilter.value) params.set("kind", kindFilter.value);

  api.get(`/api/media?${params}`).then((data: any) => {
    items.value = data.items;
    total.value = data.total;
    loading.value = false;
  });
}

export function MediaBrowser() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    kindFilter.value = getParam("kind");
    page.value = getParamInt("page", 1);
    fetchMedia();
  }, []);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    uploading.value = true;

    for (const file of files) {
      const date = new Date().toISOString().slice(0, 10);
      const ext = file.name.split(".").pop();
      const name = file.name
        .replace(/\.[^.]+$/, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      const prefix = file.type.startsWith("audio/") ? "audio" : "img";
      const key = `${prefix}/${date}-${name}.${ext}`;

      try {
        await api.uploadFile(file, key);
      } catch (e) {
        console.error("Upload failed:", e);
      }
    }

    uploading.value = false;
    fetchMedia();
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    handleUpload(e.dataTransfer?.files ?? null);
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
  }

  function copyMarkdown(key: string) {
    const url = `${MEDIA_URL}/${key}`;
    const isAudio = key.match(/\.(m4a|mp3|ogg|wav)$/i);
    const md = isAudio
      ? `{{<audio src="/${key}">}}`
      : `![](${url})`;
    navigator.clipboard.writeText(md);
  }

  const totalPages = Math.ceil(total.value / LIMIT);

  return (
    <div>
      <div class="page-header">
        <h1 class="page-title">Media</h1>
        <div style="display:flex;gap:0.5rem;align-items:center">
          <select
            value={kindFilter.value}
            onChange={(e) => {
              kindFilter.value = (e.target as HTMLSelectElement).value;
              page.value = 1;
              fetchMedia();
            }}
            class="select"
            style="width:auto"
          >
            <option value="">All types</option>
            <option value="image">Images</option>
            <option value="audio">Audio</option>
            <option value="file">Other</option>
          </select>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading.value}
            class="btn btn-primary"
          >
            {uploading.value ? "Uploading..." : "Upload"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style="display:none"
            onChange={(e) => handleUpload((e.target as HTMLInputElement).files)}
          />
        </div>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        class="media-drop-zone"
      >
        {loading.value ? (
          <p class="loading">Loading...</p>
        ) : items.value.length === 0 ? (
          <p class="empty">No media. Drag files here or click Upload.</p>
        ) : (
          <div class="media-grid">
            {items.value.map((item) => (
              <div class="media-card">
                {item.kind === "image" ? (
                  <img
                    src={`${MEDIA_URL}/${item.r2_key}`}
                    loading="lazy"
                    alt=""
                  />
                ) : (
                  <div class="media-card-placeholder">
                    {item.kind === "audio" ? "\u266A" : "\u{1F4C4}"}
                  </div>
                )}
                <div class="media-card-body">
                  <div class="media-card-key" title={item.r2_key}>
                    {item.r2_key}
                  </div>
                  {item.content_refs.length > 0 ? (
                    <div style="margin-top:0.15rem">
                      {item.content_refs.map((ref) => (
                        <a
                          key={`${ref.type}-${ref.slug}`}
                          href={`/content/edit/${ref.type}/${ref.slug}`}
                          class="media-card-ref"
                          title={ref.title}
                        >
                          {ref.type}/{ref.slug}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div class="media-card-unattached">Unattached</div>
                  )}
                  <div class="media-card-actions">
                    <button onClick={() => copyKey(item.r2_key)} class="media-btn" title="Copy R2 key">
                      Key
                    </button>
                    <button onClick={() => copyMarkdown(item.r2_key)} class="media-btn" title="Copy markdown">
                      MD
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div class="pagination">
        <span class="pagination-info">{total.value} files</span>
        {totalPages > 1 && (
          <>
            <button
              disabled={page.value <= 1}
              onClick={() => { page.value--; fetchMedia(); }}
              class="btn btn-secondary btn-sm"
            >
              Prev
            </button>
            <span class="pagination-info">{page.value}/{totalPages}</span>
            <button
              disabled={page.value >= totalPages}
              onClick={() => { page.value++; fetchMedia(); }}
              class="btn btn-secondary btn-sm"
            >
              Next
            </button>
          </>
        )}
      </div>
    </div>
  );
}
