import "server-only";

import { env } from "@/lib/env";
import { PerplexitySearchProvider } from "@/lib/providers/perplexity";
import { PublicWebSearchProvider } from "@/lib/providers/public-search";
import { ExaSearchProvider } from "@/lib/providers/exa";
import type { SearchResult, WebSearchProvider } from "@/lib/providers/types";

export class MultiSearchProvider implements WebSearchProvider {
  readonly name = "exa+public-web";
  private providers: WebSearchProvider[] = [];

  constructor() {
    if (env.EXA_API_KEY) {
      this.providers.push(new ExaSearchProvider());
    }

    if (env.PERPLEXITY_API_KEY) {
      this.providers.push(new PerplexitySearchProvider());
    }

    this.providers.push(new PublicWebSearchProvider());
  }

  async search(query: string, limit = 15): Promise<SearchResult[]> {
    const searches = await Promise.allSettled(
      this.providers.map((p) => p.search(query, limit)),
    );

    const groups = searches
      .filter(
        (result): result is PromiseFulfilledResult<SearchResult[]> =>
          result.status === "fulfilled" && result.value.length > 0,
      )
      .map((result) => result.value);

    const results: SearchResult[] = [];
    const seenUrls = new Set<string>();
    const maxLen = Math.max(0, ...groups.map((g) => g.length));

    for (let index = 0; index < maxLen && results.length < limit; index += 1) {
      for (const group of groups) {
        const item = group[index];
        if (!item) continue;
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          results.push(item);
          if (results.length >= limit) return results;
        }
      }
    }

    return results;
  }
}
