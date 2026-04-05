/**
 * Custom Astro 5 content loaders that fetch from the CMS API at build time.
 */

import type { Loader } from "astro/loaders";

const CMS_API_URL = import.meta.env.CMS_API_URL ?? "http://localhost:8788";
const CMS_API_KEY = import.meta.env.CMS_API_KEY ?? "dev-test-key";

async function cmsGet(path: string): Promise<unknown> {
  const url = `${CMS_API_URL}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${CMS_API_KEY}` },
  });
  if (!res.ok) {
    throw new Error(`CMS API error: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/**
 * Content loader: fetches content items of a given type from the CMS.
 * Returns entries compatible with Astro's content collection system.
 */
export function cmsContentLoader(type: string): Loader {
  return {
    name: `cms-${type}`,
    async load({ store, logger, renderMarkdown }) {
      logger.info(`Fetching ${type} content from CMS...`);

      let page = 1;
      const limit = 100;
      let total = 0;

      store.clear();

      do {
        const data = (await cmsGet(
          `/api/content?type=${type}&status=published&page=${page}&limit=${limit}&sort=date&order=desc`,
        )) as {
          items: Array<{
            slug: string;
            title: string;
            body: string;
            date: string;
            meta: Record<string, unknown>;
            tags: string[];
          }>;
          total: number;
        };

        total = data.total;

        for (const item of data.items) {
          // Merge meta fields into top-level data (matching the existing Zod schema shape)
          const entryData: Record<string, unknown> = {
            title: item.title,
            date: new Date(item.date),
            ...item.meta,
          };

          // Tags: include for types that use them
          if (item.tags && item.tags.length > 0) {
            entryData.tags = item.tags;
          }

          const rendered = item.body ? await renderMarkdown(item.body) : undefined;

          store.set({
            id: item.slug,
            data: entryData,
            body: item.body,
            rendered,
          });
        }

        page++;
      } while ((page - 1) * limit < total);

      logger.info(`Loaded ${total} ${type} items from CMS`);
    },
  };
}

/**
 * Data loader: fetches structured data (books, films, links) from the CMS.
 */
export function cmsDataLoader(endpoint: string): Loader {
  return {
    name: `cms-data-${endpoint}`,
    async load({ store, logger }) {
      logger.info(`Fetching data from CMS: ${endpoint}...`);
      const data = (await cmsGet(`/api/data/${endpoint}`)) as unknown[];

      store.clear();
      for (let i = 0; i < data.length; i++) {
        store.set({
          id: String(i),
          data: data[i] as Record<string, unknown>,
        });
      }

      logger.info(`Loaded ${data.length} items from ${endpoint}`);
    },
  };
}
