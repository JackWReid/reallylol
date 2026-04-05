import { useState } from "preact/hooks";

const PER_PAGE = 24;

interface Photo {
  id: string;
  title: string;
  date: string;
  image: string;
  location?: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

export function PhotoGrid({ photos, mediaBase }: { photos: Photo[]; mediaBase: string }) {
  const [shown, setShown] = useState(PER_PAGE);
  const visible = photos.slice(0, shown);
  const hasMore = shown < photos.length;

  return (
    <div class="photo-gallery">
      <div class="photo-grid">
        {visible.map((photo) => (
          <a href={`/photo/${photo.id}/`} class="photo-grid__item" key={photo.id}>
            <img
              src={`${mediaBase}/${photo.image}`}
              alt={photo.title}
              loading="lazy"
            />
            <div class="photo-grid__overlay">
              <span class="photo-grid__title">{photo.title}</span>
              <span class="photo-grid__meta">
                {photo.location && `${photo.location} · `}{formatDate(photo.date)}
              </span>
            </div>
          </a>
        ))}
      </div>
      {hasMore && (
        <div class="load-more">
          <button
            type="button"
            class="load-more__btn load-more__btn--dark"
            onClick={() => setShown((s) => s + PER_PAGE)}
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
