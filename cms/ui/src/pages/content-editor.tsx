import { useEffect, useRef } from "preact/hooks";
import { signal } from "@preact/signals";
import { api } from "../lib/api";
import { MarkdownEditor } from "../components/markdown-editor";
import { TagInput } from "../components/tag-input";
import { route } from "preact-router";
import type { ContentItem, ContentType } from "../../../../shared/types";

// Editor state
const contentType = signal<ContentType>("post");
const slug = signal("");
const title = signal("");
const body = signal("");
const date = signal("");
const status = signal<"draft" | "published">("draft");
const tags = signal<string[]>([]);
const meta = signal<Record<string, unknown>>({});
const isNew = signal(true);
const saving = signal(false);
const error = signal("");
const uploading = signal(false);
const showMediaPicker = signal(false);
const mediaImages = signal<Array<{ r2_key: string }>>([]);
const mediaSearch = signal("");

// Meta field configs per type
const META_FIELDS: Record<string, Array<{ key: string; label: string; type?: string }>> = {
  post: [
    { key: "subtitle", label: "Subtitle" },
    { key: "book_author", label: "Book Author" },
    { key: "movie_released", label: "Movie Released" },
    { key: "media_image", label: "Media Image URL" },
    { key: "rating", label: "Rating", type: "number" },
    { key: "url", label: "URL" },
  ],
  photo: [
    { key: "image", label: "Image (R2 key)" },
    { key: "location", label: "Location" },
  ],
  highlight: [
    { key: "link", label: "Source Link" },
  ],
  page: [
    { key: "layout", label: "Layout" },
    { key: "url", label: "URL Path" },
    { key: "section", label: "Section" },
    { key: "data_source", label: "Data Source" },
  ],
};

// Types that have a body/markdown editor
const TYPES_WITH_BODY: string[] = ["post", "photo", "highlight", "page"];
// Types that are "pages" - show URL instead of slug
const PAGE_TYPES: string[] = ["page"];

const MEDIA_URL = "https://media.really.lol";
const PAGE_LAYOUTS = ["plain", "redirect"];
const PAGE_SECTIONS = ["books", "films", "links"];
const PAGE_DATA_SOURCES = ["books:read", "books:reading", "books:toread", "films:watched", "films:towatch", "links:saved"];

// Parse a "Copy Link to Highlight" URL
// e.g. https://example.com/page#:~:text=highlighted%20text
function parseHighlightUrl(url: string): { sourceUrl: string; highlightText: string; pageTitle: string } | null {
  const fragmentMatch = url.match(/#:~:text=(.+)$/);
  if (!fragmentMatch) return null;
  const sourceUrl = url.replace(/#:~:text=.+$/, "");
  const rawText = decodeURIComponent(fragmentMatch[1])
    // Text fragment spec uses comma to separate prefix/suffix and hyphen for ranges
    .replace(/,/g, " ")
    .replace(/-/g, " - ");
  // Clean up percent-encoded punctuation that browsers add
  const highlightText = rawText.replace(/\s+/g, " ").trim();
  // Derive a rough page title from the URL path
  const pathname = new URL(sourceUrl).pathname.replace(/\/$/, "");
  const lastSegment = pathname.split("/").pop() ?? "";
  const pageTitle = lastSegment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
  return { sourceUrl, highlightText, pageTitle };
}

function resetForm() {
  contentType.value = "post";
  slug.value = "";
  title.value = "";
  body.value = "";
  date.value = new Date().toISOString().slice(0, 16);
  status.value = "draft";
  tags.value = [];
  meta.value = {};
  isNew.value = true;
  error.value = "";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface Props {
  type?: string;
  slug?: string;
  path: string;
}

// Extract EXIF data from an image file using browser APIs
async function extractExif(file: File): Promise<{ date?: string; location?: string }> {
  const result: { date?: string; location?: string } = {};
  try {
    const buf = await file.arrayBuffer();
    const view = new DataView(buf);

    // Quick JPEG EXIF parser - find the DateTimeOriginal tag
    if (view.getUint16(0) !== 0xFFD8) return result; // not JPEG

    let offset = 2;
    while (offset < view.byteLength - 2) {
      const marker = view.getUint16(offset);
      if (marker === 0xFFE1) { // APP1 (EXIF)
        const exifData = parseExifBlock(view, offset + 4);
        if (exifData.dateTime) {
          // EXIF date format: "2024:01:15 14:30:00" → "2024-01-15T14:30:00"
          result.date = exifData.dateTime
            .replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3")
            .replace(" ", "T");
        }
        break;
      }
      if ((marker & 0xFF00) !== 0xFF00) break;
      offset += 2 + view.getUint16(offset + 2);
    }
  } catch {
    // EXIF parsing is best-effort
  }
  return result;
}

function parseExifBlock(view: DataView, start: number): { dateTime?: string } {
  // Check for "Exif\0\0"
  const exifHeader = String.fromCharCode(
    view.getUint8(start), view.getUint8(start + 1),
    view.getUint8(start + 2), view.getUint8(start + 3),
  );
  if (exifHeader !== "Exif") return {};

  const tiffStart = start + 6;
  const littleEndian = view.getUint16(tiffStart) === 0x4949;
  const getU16 = (o: number) => view.getUint16(o, littleEndian);
  const getU32 = (o: number) => view.getUint32(o, littleEndian);

  function readString(offset: number, length: number): string {
    let s = "";
    for (let i = 0; i < length; i++) {
      const c = view.getUint8(offset + i);
      if (c === 0) break;
      s += String.fromCharCode(c);
    }
    return s;
  }

  function findTag(ifdOffset: number, tagId: number): string | undefined {
    const count = getU16(ifdOffset);
    for (let i = 0; i < count; i++) {
      const entryOffset = ifdOffset + 2 + i * 12;
      if (getU16(entryOffset) === tagId) {
        const type = getU16(entryOffset + 2);
        const numValues = getU32(entryOffset + 4);
        if (type === 2) { // ASCII
          const strLen = numValues;
          const valOffset = strLen > 4
            ? tiffStart + getU32(entryOffset + 8)
            : entryOffset + 8;
          return readString(valOffset, strLen);
        }
      }
    }
    return undefined;
  }

  // Find IFD0
  const ifd0Offset = tiffStart + getU32(tiffStart + 4);

  // Look for ExifIFD pointer (tag 0x8769)
  const count = getU16(ifd0Offset);
  for (let i = 0; i < count; i++) {
    const entryOffset = ifd0Offset + 2 + i * 12;
    if (getU16(entryOffset) === 0x8769) {
      const exifIfdOffset = tiffStart + getU32(entryOffset + 8);
      // DateTimeOriginal = 0x9003
      const dateTime = findTag(exifIfdOffset, 0x9003);
      if (dateTime) return { dateTime };
    }
  }

  // Fallback: DateTime from IFD0 (tag 0x0132)
  const dateTime = findTag(ifd0Offset, 0x0132);
  return { dateTime };
}

export function ContentEditor({ type: editType, slug: editSlug }: Props) {
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editType && editSlug) {
      isNew.value = false;
      api.get(`/api/content/${editType}/${editSlug}`).then((data: any) => {
        contentType.value = data.type;
        slug.value = data.slug;
        title.value = data.title;
        body.value = data.body;
        date.value = data.date?.slice(0, 16) ?? "";
        status.value = data.status;
        tags.value = data.tags ?? [];
        meta.value = data.meta ?? {};
      });
    } else {
      resetForm();
      const params = new URLSearchParams(window.location.search);
      const presetType = params.get("type");
      if (presetType) contentType.value = presetType as ContentType;
      const presetTitle = params.get("title");
      if (presetTitle) title.value = presetTitle;
      const presetTags = params.get("tags");
      if (presetTags) tags.value = presetTags.split(",");
      const presetDate = params.get("date");
      if (presetDate) date.value = presetDate.slice(0, 16);
      const presetMeta = params.get("meta");
      if (presetMeta) {
        try { meta.value = JSON.parse(presetMeta); } catch {}
      }
    }
  }, [editType, editSlug]);

  async function save() {
    saving.value = true;
    error.value = "";

    try {
      const payload: Record<string, unknown> = {
        title: title.value,
        body: body.value,
        date: date.value ? new Date(date.value).toISOString() : undefined,
        status: status.value,
        tags: tags.value,
        meta: meta.value,
      };

      if (isNew.value) {
        const s = slug.value || slugify(title.value);
        const result = (await api.post("/api/content", {
          ...payload,
          type: contentType.value,
          slug: s,
        })) as ContentItem;
        slug.value = result.slug;
        isNew.value = false;
        status.value = result.status as "draft" | "published";
        route(`/content/edit/${result.type}/${result.slug}`, true);
      } else {
        const result = (await api.put(
          `/api/content/${contentType.value}/${slug.value}`,
          payload,
        )) as ContentItem;
        status.value = result.status as "draft" | "published";
      }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      saving.value = false;
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete ${contentType.value}/${slug.value}?`)) return;
    try {
      await api.del(`/api/content/${contentType.value}/${slug.value}`);
      route("/content");
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e);
    }
  }

  function setMeta(key: string, value: unknown) {
    meta.value = { ...meta.value, [key]: value || undefined };
  }

  async function handlePhotoUpload(file: File) {
    uploading.value = true;
    error.value = "";

    try {
      // Extract EXIF
      const exif = await extractExif(file);

      // Set date from EXIF if available and date is still default/empty
      if (exif.date) {
        date.value = exif.date.slice(0, 16);
      }

      // Generate R2 key
      const datePrefix = date.value.slice(0, 10) || new Date().toISOString().slice(0, 10);
      const name = file.name
        .replace(/\.[^.]+$/, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const r2Key = `img/photo/${datePrefix}-${name}.${ext}`;

      // Upload to R2
      await api.uploadFile(file, r2Key);

      // Set meta.image
      setMeta("image", r2Key);

      // Prefill slug if empty
      if (!slug.value) {
        slug.value = `${datePrefix}-${name}`;
      }

      // Set body with image shortcode
      // No need to set body - photo pages render from meta.image, not body
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      uploading.value = false;
    }
  }

  async function handleInsertImage(file: File) {
    uploading.value = true;
    error.value = "";

    try {
      const datePrefix = new Date().toISOString().slice(0, 10);
      const name = file.name
        .replace(/\.[^.]+$/, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const r2Key = `img/post/${datePrefix}-${name}.${ext}`;

      await api.uploadFile(file, r2Key);

      // Insert markdown image at current cursor (append to body for now)
      const imgMarkdown = `![](${MEDIA_URL}/${r2Key})`;
      body.value = body.value
        ? `${body.value}\n\n${imgMarkdown}`
        : imgMarkdown;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      uploading.value = false;
    }
  }

  const metaFields = META_FIELDS[contentType.value] ?? [];
  const hasBody = TYPES_WITH_BODY.includes(contentType.value);
  const isPage = PAGE_TYPES.includes(contentType.value);
  const isPhoto = contentType.value === "photo";
  const isHighlight = contentType.value === "highlight";
  const imageKey = meta.value.image as string | undefined;

  return (
    <div>
      <div class="page-header">
        <h1 class="page-title">
          {isNew.value ? "New Content" : `Edit ${contentType.value}/${slug.value}`}
        </h1>
        <div class="editor-actions">
          <label class="draft-toggle">
            <input
              type="checkbox"
              checked={status.value === "draft"}
              onChange={(e) => {
                status.value = (e.target as HTMLInputElement).checked ? "draft" : "published";
              }}
            />
            Draft
          </label>
          {!isNew.value && (
            <button onClick={handleDelete} class="btn btn-danger" disabled={saving.value}>
              Delete
            </button>
          )}
          <button
            onClick={() => save()}
            disabled={saving.value}
            class="btn btn-primary"
          >
            {saving.value ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {error.value && <div class="error-banner">{error.value}</div>}

      {/* Highlight URL paste zone */}
      {isHighlight && isNew.value && !body.value && (
        <div class="highlight-paste-zone">
          <input
            class="input"
            type="url"
            placeholder="Paste a 'Copy Link to Highlight' URL..."
            onPaste={(e) => {
              const text = (e as ClipboardEvent).clipboardData?.getData("text") ?? "";
              const parsed = parseHighlightUrl(text);
              if (parsed) {
                e.preventDefault();
                setMeta("link", parsed.sourceUrl);
                body.value = `> ${parsed.highlightText}`;
                if (!title.value && parsed.pageTitle) title.value = parsed.pageTitle;
                if (!slug.value && parsed.pageTitle) slug.value = slugify(parsed.pageTitle);
              }
            }}
          />
        </div>
      )}

      {/* Photo upload zone - shown for new photos without an image yet */}
      {isPhoto && !imageKey && (
        <div
          class="photo-upload-zone"
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer?.files[0];
            if (file) handlePhotoUpload(file);
          }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => photoInputRef.current?.click()}
        >
          <div class="photo-upload-prompt">
            {uploading.value ? "Uploading..." : "Drop a photo here or click to upload"}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            style="display:none"
            onChange={(e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handlePhotoUpload(file);
            }}
          />
        </div>
      )}

      {/* Photo preview when image is set */}
      {isPhoto && imageKey && (
        <div class="photo-preview">
          <img src={`${MEDIA_URL}/${imageKey}`} alt="" />
        </div>
      )}

      <div class="form-row form-row-2">
        <div class="form-group">
          <label class="label">Type</label>
          <select
            value={contentType.value}
            onChange={(e) => (contentType.value = (e.target as HTMLSelectElement).value as ContentType)}
            disabled={!isNew.value}
            class="select"
          >
            {["post", "note", "photo", "highlight", "page"].map((t) => (
              <option value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div class="form-group">
          <label class="label">{isPage ? "URL Path" : "Slug"}</label>
          {isPage ? (
            <input
              value={(meta.value.url as string) ?? ""}
              onInput={(e) => setMeta("url", (e.target as HTMLInputElement).value)}
              placeholder="/about/page-name"
              class="input"
            />
          ) : (
            <input
              value={slug.value}
              onInput={(e) => (slug.value = (e.target as HTMLInputElement).value)}
              placeholder={slugify(title.value) || "auto-generated"}
              disabled={!isNew.value}
              class="input"
            />
          )}
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="label">Title</label>
          <input
            value={title.value}
            onInput={(e) => (title.value = (e.target as HTMLInputElement).value)}
            class="input input-lg"
          />
        </div>
      </div>

      <div class="form-row form-row-2">
        <div class="form-group">
          <label class="label">Date</label>
          <input
            type="datetime-local"
            value={date.value}
            onInput={(e) => (date.value = (e.target as HTMLInputElement).value)}
            class="input"
          />
        </div>
        <div class="form-group">
          <label class="label">Tags</label>
          <TagInput tags={tags.value} onChange={(t) => (tags.value = t)} />
        </div>
      </div>

      {metaFields.length > 0 && (
        <div class="meta-panel">
          <div class="form-row form-row-auto">
            {metaFields
              .filter((f) => !(isPage && f.key === "url")) // URL shown above for pages
              .map((field) => (
              <div class="form-group">
                <label class="label">{field.label}</label>
                {field.key === "layout" ? (
                  <select
                    value={String(meta.value.layout ?? "")}
                    onChange={(e) => setMeta("layout", (e.target as HTMLSelectElement).value || undefined)}
                    class="select"
                  >
                    <option value="">None</option>
                    {PAGE_LAYOUTS.map((l) => (
                      <option value={l}>{l}</option>
                    ))}
                  </select>
                ) : field.key === "section" ? (
                  <select
                    value={String(meta.value.section ?? "")}
                    onChange={(e) => setMeta("section", (e.target as HTMLSelectElement).value || undefined)}
                    class="select"
                  >
                    <option value="">None</option>
                    {PAGE_SECTIONS.map((s) => (
                      <option value={s}>{s}</option>
                    ))}
                  </select>
                ) : field.key === "data_source" ? (
                  <select
                    value={String(meta.value.data_source ?? "")}
                    onChange={(e) => setMeta("data_source", (e.target as HTMLSelectElement).value || undefined)}
                    class="select"
                  >
                    <option value="">None</option>
                    {PAGE_DATA_SOURCES.map((d) => (
                      <option value={d}>{d}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type ?? "text"}
                    value={String(meta.value[field.key] ?? "")}
                    onInput={(e) => {
                      const val = (e.target as HTMLInputElement).value;
                      setMeta(field.key, field.type === "number" && val ? parseFloat(val) : val);
                    }}
                    class="input"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {hasBody && (
        <div class="editor-body">
          <div class="editor-toolbar">
            <label class="label" style="margin:0">Body</label>
            <div class="editor-toolbar-actions">
              <button
                class="btn btn-ghost btn-sm"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = () => {
                    const file = input.files?.[0];
                    if (file) handleInsertImage(file);
                  };
                  input.click();
                }}
                disabled={uploading.value}
              >
                {uploading.value ? "Uploading..." : "Upload image"}
              </button>
              <button
                class="btn btn-ghost btn-sm"
                onClick={async () => {
                  if (!showMediaPicker.value) {
                    const data = (await api.get("/api/media?kind=image&limit=50")) as any;
                    mediaImages.value = data.items;
                  }
                  showMediaPicker.value = !showMediaPicker.value;
                  mediaSearch.value = "";
                }}
              >
                {showMediaPicker.value ? "Close" : "From library"}
              </button>
            </div>
          </div>
          {showMediaPicker.value && (
            <div class="media-picker">
              <input
                class="input media-picker-search"
                placeholder="Search images..."
                value={mediaSearch.value}
                onInput={(e) => {
                  const q = (e.target as HTMLInputElement).value;
                  mediaSearch.value = q;
                  clearTimeout((window as any).__mediaSearchTimer);
                  (window as any).__mediaSearchTimer = setTimeout(async () => {
                    const url = q
                      ? `/api/media?kind=image&limit=50&search=${encodeURIComponent(q)}`
                      : `/api/media?kind=image&limit=50`;
                    const data = (await api.get(url)) as any;
                    mediaImages.value = data.items;
                  }, 300);
                }}
              />
              <div class="media-picker-grid">
                {mediaImages.value
                  .map((m) => (
                    <button
                      key={m.r2_key}
                      class="media-picker-item"
                      onClick={() => {
                        const imgMarkdown = `![](${MEDIA_URL}/${m.r2_key})`;
                        body.value = body.value
                          ? `${body.value}\n\n${imgMarkdown}`
                          : imgMarkdown;
                        showMediaPicker.value = false;
                      }}
                      title={m.r2_key}
                    >
                      <img src={`${MEDIA_URL}/${m.r2_key}`} alt="" loading="lazy" />
                    </button>
                  ))}
              </div>
            </div>
          )}
          <MarkdownEditor
            value={body.value}
            onChange={(v) => (body.value = v)}
          />
        </div>
      )}
    </div>
  );
}
