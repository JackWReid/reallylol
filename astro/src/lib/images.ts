const R2_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.PUBLIC_R2_BASE) ??
  "https://media.really.lol";

export function r2Url(path: string): string {
  const clean = path.replace(/^\//, "");
  return `${R2_BASE}/${clean}`;
}

export function r2Thumb(path: string, size = 500): string {
  const clean = path.replace(/^\//, "");
  return `${R2_BASE}/cdn-cgi/image/width=${size},height=${size},fit=cover/${clean}`;
}

export function r2Hero(path: string, size = 1400): string {
  const clean = path.replace(/^\//, "");
  return `${R2_BASE}/cdn-cgi/image/width=${size},height=${size},fit=inside/${clean}`;
}
