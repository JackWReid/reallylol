import { useState } from "preact/hooks";
import type { FeedItem } from "../lib/cms-data";

const PER_PAGE = 24;

function typeLabel(type: string): string {
  if (type === "post") return "journal";
  return type;
}

function typeUrl(item: FeedItem): string {
  if (item.type === "post") return `/post/${item.slug}/`;
  if (item.type === "note") return `/notes/${item.slug}/`;
  if (item.type === "photo") return `/photo/${item.slug}/`;
  if (item.type === "highlight") return `/links/`;
  return "/";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function HomeFeed({ items }: { items: FeedItem[] }) {
  const [shown, setShown] = useState(PER_PAGE);
  const visible = items.slice(0, shown);
  const hasMore = shown < items.length;

  const featured = visible[0];
  const rest = visible.slice(1);

  return (
    <div class="home-feed">
      {featured && (
        <a href={typeUrl(featured)} class="feed-featured">
          <div class="feed-featured__text">
            <span class="feed-meta">
              {typeLabel(featured.type)} · {formatDate(featured.date)}
            </span>
            <h2 class="feed-featured__title">{featured.title}</h2>
            {featured.excerpt && (
              <p class="feed-featured__excerpt">{featured.excerpt}</p>
            )}
          </div>
        </a>
      )}
      <div class="feed-list">
        {rest.map((item) => (
          <a href={typeUrl(item)} class="feed-item" key={`${item.type}-${item.slug}`}>
            <div class="feed-item__text">
              <span class="feed-item__title">{item.title}</span>
              <span class="feed-meta">
                {typeLabel(item.type)} · {formatDate(item.date)}
              </span>
            </div>
            {item.type === "photo" && item.image && (
              <div class="feed-item__thumb">
                <img
                  src={`https://media.really.lol/${item.image}`}
                  alt=""
                  loading="lazy"
                />
              </div>
            )}
          </a>
        ))}
      </div>
      {hasMore && (
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
    </div>
  );
}
