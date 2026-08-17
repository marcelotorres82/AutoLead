import { env } from "@/lib/env";
import { assertSafePublicUrl } from "@/lib/security";
import type { SearchResult, WebSearchProvider } from "@/lib/providers/types";
import { z } from "zod";
const responseSchema = z.object({
  results: z.array(
    z.object({
      title: z.string(),
      url: z.string().url(),
      content: z.string(),
      published_date: z.string().nullish(),
    }),
  ),
});
export class TavilySearchProvider implements WebSearchProvider {
  readonly name = "tavily";
  async search(query: string, limit = 10): Promise<SearchResult[]> {
    if (!env.TAVILY_API_KEY) throw new Error("TAVILY_API_KEY não configurada");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${env.TAVILY_API_KEY}`,
        },
        body: JSON.stringify({
          query,
          max_results: Math.min(limit, 20),
          search_depth: "advanced",
          chunks_per_source: 3,
          country: "brazil",
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Tavily respondeu ${response.status}`);
      return responseSchema
        .parse(await response.json())
        .results.map((item) => ({
          title: item.title,
          url: assertSafePublicUrl(item.url).toString(),
          content: item.content,
          publishedAt: item.published_date ?? undefined,
          provider: this.name,
        }));
    } finally {
      clearTimeout(timer);
    }
  }
}
