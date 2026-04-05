const R2_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.PUBLIC_R2_BASE) ??
  "https://media.really.lol";

// Cloudflare Image Resizing requires a Pro plan or the Image Resizing add-on.
// Set PUBLIC_CF_IMAGE_RESIZING=true in .env.local once enabled.
const CF_IMAGE_RESIZING =
  typeof import.meta !== "undefined" &&
  import.meta.env?.PUBLIC_CF_IMAGE_RESIZING === "true";

export function r2Url(path: string): string {
  const clean = path.replace(/^\//, "");
  return `${R2_BASE}/${clean}`;
}

export function r2Thumb(path: string, size = 500): string {
  const clean = path.replace(/^\//, "");
  if (!CF_IMAGE_RESIZING) return `${R2_BASE}/${clean}`;
  return `${R2_BASE}/cdn-cgi/image/width=${size},height=${size},fit=cover/${clean}`;
}

export function r2Hero(path: string, size = 1400): string {
  const clean = path.replace(/^\//, "");
  if (!CF_IMAGE_RESIZING) return `${R2_BASE}/${clean}`;
  return `${R2_BASE}/cdn-cgi/image/width=${size},height=${size},fit=inside/${clean}`;
}
