import "server-only";

import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { researchCache } from "@/db/schema";
import type { SearchResult, WebSearchProvider } from "@/lib/providers/types";

const searchResultsSchema = z.array(
  z.object({
    title: z.string(),
    url: z.string().url(),
    content: z.string(),
    publishedAt: z.string().optional(),
    provider: z.string().optional(),
  }),
);

export const cacheTtl = {
  siteAnalysis: 7 * 86_400_000,
  technology: 7 * 86_400_000,
  companyProfile: 30 * 86_400_000,
  news: 86_400_000,
  research: 7 * 86_400_000,
  contacts: 14 * 86_400_000,
} as const;

export function isCacheFresh(expiresAt: string | Date, now = new Date()) {
  const expiry = new Date(expiresAt);
  return !Number.isNaN(expiry.getTime()) && expiry.getTime() > now.getTime();
}

function searchCacheKey(provider: string, query: string, limit: number) {
  return createHash("sha256")
    .update(`${provider}:${limit}:${query.trim().toLowerCase()}`)
    .digest("hex");
}

export async function searchWithCache(
  provider: WebSearchProvider,
  query: string,
  limit = 10,
  bypass = false,
): Promise<SearchResult[]> {
  const db = getDb();
  const cacheKey = searchCacheKey(provider.name, query, limit);
  if (!bypass) {
    const [cached] = await db
      .select({ value: researchCache.value })
      .from(researchCache)
      .where(
        and(
          eq(researchCache.cacheKey, cacheKey),
          gt(researchCache.expiresAt, new Date()),
        ),
      )
      .limit(1);
    const parsed = searchResultsSchema.safeParse(cached?.value);
    if (parsed.success) return parsed.data;
  }
  const results = searchResultsSchema.parse(
    await provider.search(query, limit),
  );
  await db
    .insert(researchCache)
    .values({
      cacheKey,
      kind: "news",
      value: results,
      expiresAt: new Date(Date.now() + cacheTtl.news),
    })
    .onConflictDoUpdate({
      target: researchCache.cacheKey,
      set: {
        value: results,
        expiresAt: new Date(Date.now() + cacheTtl.news),
        updatedAt: new Date(),
      },
    });
  return results;
}
