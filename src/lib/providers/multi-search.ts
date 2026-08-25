import "server-only";

import { env } from "@/lib/env";
import { AnthropicSearchProvider } from "@/lib/providers/anthropic-search";
import { PerplexitySearchProvider } from "@/lib/providers/perplexity";
import { PublicWebSearchProvider } from "@/lib/providers/public-search";
import { ExaSearchProvider } from "@/lib/providers/exa";
import type { SearchResult, WebSearchProvider } from "@/lib/providers/types";

export class MultiSearchProvider implements WebSearchProvider {
  readonly name = "multi-search";
  private providers: WebSearchProvider[] = [];

  constructor() {
    // 1. Provedor Anthropic Claude (se chave presente)
    if (env.ANTHROPIC_API_KEY) {
      this.providers.push(new AnthropicSearchProvider());
    }

    // 2. Provedor Perplexity (busca direta com sonar ou fallback inteligente)
    this.providers.push(new PerplexitySearchProvider());

    // 3. Provedor Exa (se configurado)
    if (env.EXA_API_KEY) {
      this.providers.push(new ExaSearchProvider());
    }

    // 4. Provedor Público Web (DuckDuckGo/web scraping resiliente e gratuito)
    this.providers.push(new PublicWebSearchProvider());
  }

  async search(query: string, limit = 15): Promise<SearchResult[]> {
    const searches = await Promise.allSettled(
      this.providers.map((p) => p.search(query, limit)),
    );

    const results: SearchResult[] = [];
    const seenUrls = new Set<string>();

    for (const result of searches) {
      if (result.status === "fulfilled") {
        for (const item of result.value) {
          if (!seenUrls.has(item.url)) {
            seenUrls.add(item.url);
            results.push(item);
            if (results.length >= limit) return results;
          }
        }
      }
    }

    if (results.length === 0) {
      const fallback = new PublicWebSearchProvider();
      return fallback.search(query, limit);
    }

    return results;
  }
}
