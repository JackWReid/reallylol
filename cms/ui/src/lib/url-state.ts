/**
 * Read/write URL query params without full page navigation.
 * Keeps the SPA router happy while giving linkable filter/tab state.
 */

export function getParam(key: string, fallback = ""): string {
  const params = new URLSearchParams(window.location.search);
  return params.get(key) ?? fallback;
}

export function getParamInt(key: string, fallback = 1): number {
  const v = getParam(key);
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
}

export function setParams(updates: Record<string, string | number | null>): void {
  const params = new URLSearchParams(window.location.search);
  for (const [key, val] of Object.entries(updates)) {
    if (val === null || val === "" || val === undefined) {
      params.delete(key);
    } else {
      params.set(key, String(val));
    }
  }
  const qs = params.toString();
  const url = window.location.pathname + (qs ? `?${qs}` : "");
  history.replaceState(null, "", url);
}
