const API_BASE = "";

function getApiKey(): string {
  return localStorage.getItem("cms_api_key") ?? "";
}

export function setApiKey(key: string) {
  localStorage.setItem("cms_api_key", key);
}

export function clearApiKey() {
  localStorage.removeItem("cms_api_key");
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}

// Callback set by the app to handle auth failures
let onAuthFailure: (() => void) | null = null;
export function setAuthFailureHandler(handler: () => void) {
  onAuthFailure = handler;
}

async function request(method: string, path: string, body?: unknown) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getApiKey()}`,
  };
  const init: RequestInit = { method, headers };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, init);
  if (res.status === 401) {
    clearApiKey();
    onAuthFailure?.();
    throw new Error("Unauthorised");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "unknown", message: `HTTP ${res.status}` }));
    throw new Error(data.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  get: (path: string) => request("GET", path),
  post: (path: string, body: unknown) => request("POST", path, body),
  put: (path: string, body: unknown) => request("PUT", path, body),
  del: (path: string) => request("DELETE", path),

  /** Verify the stored API key is valid */
  async verifyKey(): Promise<boolean> {
    try {
      await request("GET", "/api/auth/verify");
      return true;
    } catch {
      return false;
    }
  },

  async uploadFile(file: File, key: string) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("key", key);

    const res = await fetch(`${API_BASE}/api/media/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getApiKey()}` },
      body: formData,
    });
    if (res.status === 401) {
      clearApiKey();
      onAuthFailure?.();
      throw new Error("Unauthorised");
    }
    if (!res.ok) throw new Error(`Upload failed: HTTP ${res.status}`);
    return res.json();
  },
};
