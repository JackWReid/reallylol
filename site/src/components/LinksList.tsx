import { useState } from "preact/hooks";

const PER_PAGE = 24;

interface SavedLink {
  title: string;
  url: string;
  date: string;
  tags?: string[];
}

interface Highlight {
  title: string;
  slug: string;
  date: string;
  link?: string;
  excerpt?: string;
}

interface BlogrollSite {
  title: string;
  url: string;
  description?: string;
  section?: string;
}

type Tab = "saved" | "highlights" | "blogroll";

interface LinksData {
  saved: SavedLink[];
  highlights: Highlight[];
  blogroll: BlogrollSite[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

function SavedList({ items }: { items: SavedLink[] }) {
  const [shown, setShown] = useState(PER_PAGE);
  const visible = items.slice(0, shown);

  return (
    <>
      <div class="links-saved">
        {visible.map((link) => (
          <div class="links-saved__item" key={link.url}>
            <div class="links-saved__header">
              <a href={link.url} target="_blank" rel="noopener" class="links-saved__title">
                {link.title}
              </a>
              <span class="links-saved__domain">{getDomain(link.url)}</span>
            </div>
            <div class="links-saved__meta">
              {link.tags?.map((tag) => <span key={tag}>#{tag}</span>)}
              <span class="links-saved__date">{formatDate(link.date)}</span>
            </div>
          </div>
        ))}
      </div>
      {shown < items.length && (
        <div class="load-more">
          <button
            type="button"
            class="load-more__btn"
            onClick={() => setShown((s) => s + PER_PAGE)}
          >
            Load more
          </button>
        </div>
      )}
    </>
  );
}

function HighlightsList({ items }: { items: Highlight[] }) {
  const [shown, setShown] = useState(PER_PAGE);
  const visible = items.slice(0, shown);

  return (
    <>
      <div class="links-highlights">
        {visible.map((h) => (
          <div class="links-highlights__item" key={h.slug}>
            <div class="links-highlights__title">{h.title}</div>
            {h.excerpt && (
              <blockquote class="links-highlights__quote">{h.excerpt}</blockquote>
            )}
            <div class="links-saved__meta">
              {h.link && <a href={h.link} target="_blank" rel="noopener">{getDomain(h.link)}</a>}
              <span class="links-saved__date">{formatDate(h.date)}</span>
            </div>
          </div>
        ))}
      </div>
      {shown < items.length && (
        <div class="load-more">
          <button
            type="button"
            class="load-more__btn"
            onClick={() => setShown((s) => s + PER_PAGE)}
          >
            Load more
          </button>
        </div>
      )}
    </>
  );
}

function BlogrollList({ items }: { items: BlogrollSite[] }) {
  // Group by section
  const sections = new Map<string, BlogrollSite[]>();
  for (const site of items) {
    const key = site.section || "";
    if (!sections.has(key)) sections.set(key, []);
    sections.get(key)!.push(site);
  }

  return (
    <div class="links-blogroll">
      {Array.from(sections.entries()).map(([section, sites]) => (
        <div key={section}>
          {section && <h3 class="links-blogroll__section">{section}</h3>}
          {sites.map((site) => (
            <div class="links-blogroll__item" key={site.url}>
              <a href={site.url} target="_blank" rel="noopener" class="links-blogroll__title">
                {site.title}
              </a>
              {site.description && (
                <span class="links-blogroll__desc">{site.description}</span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function LinksPage({ data }: { data: LinksData }) {
  const [tab, setTab] = useState<Tab>("saved");

  return (
    <div class="links-page">
      <div class="section-tabs">
        <a
          href="#"
          class={tab === "saved" ? "active" : ""}
          onClick={(e) => { e.preventDefault(); setTab("saved"); }}
        >Saved</a>
        <a
          href="#"
          class={tab === "highlights" ? "active" : ""}
          onClick={(e) => { e.preventDefault(); setTab("highlights"); }}
        >Highlights</a>
        <a
          href="#"
          class={tab === "blogroll" ? "active" : ""}
          onClick={(e) => { e.preventDefault(); setTab("blogroll"); }}
        >Blogroll</a>
      </div>

      {tab === "saved" && <SavedList items={data.saved} />}
      {tab === "highlights" && <HighlightsList items={data.highlights} />}
      {tab === "blogroll" && <BlogrollList items={data.blogroll} />}
    </div>
  );
}
