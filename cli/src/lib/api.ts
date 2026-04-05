/**
 * HTTP client for the CMS API.
 * Reads CMS_API_URL and CMS_API_KEY from environment or falls back to defaults.
 */

export class CmsApi {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = (
      process.env.CMS_API_URL ?? "http://localhost:8788"
    ).replace(/\/$/, "");
    this.apiKey = process.env.CMS_API_KEY ?? "dev-test-key";
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    };
    const init: RequestInit = { method, headers };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    const res = await fetch(url, init);
    const data = await res.json();

    if (!res.ok) {
      const err = data as { error?: string; message?: string };
      const msg = err.message ?? `HTTP ${res.status}`;
      throw new ApiError(err.error ?? "request_failed", msg, res.status);
    }

    return data;
  }

  async get(path: string): Promise<unknown> {
    return this.request("GET", path);
  }

  async post(path: string, body: unknown): Promise<unknown> {
    return this.request("POST", path, body);
  }

  async put(path: string, body: unknown): Promise<unknown> {
    return this.request("PUT", path, body);
  }

  async del(path: string): Promise<unknown> {
    return this.request("DELETE", path);
  }

  async uploadFile(
    path: string,
    filePath: string,
    key: string,
  ): Promise<unknown> {
    const file = Bun.file(filePath);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("key", key);

    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      const err = data as { error?: string; message?: string };
      throw new ApiError(
        err.error ?? "upload_failed",
        err.message ?? `HTTP ${res.status}`,
        res.status,
      );
    }
    return data;
  }
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }

  toJSON() {
    return { error: this.code, message: this.message };
  }
}
