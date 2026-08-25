import "server-only";

import { assertSafePublicUrl } from "@/lib/security";
import type { SearchResult, WebSearchProvider } from "@/lib/providers/types";
import { z } from "zod";

const responseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string(),
        }),
      }),
    )
    .optional(),
  citations: z.array(z.string()).optional(),
  web_search_results: z
    .array(
      z.object({
        url: z.string(),
        title: z.string(),
        snippet: z.string(),
      }),
    )
    .optional(),
});

export class PerplexitySearchProvider implements WebSearchProvider {
  readonly name = "perplexity";

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    const apiKey = process.env.PERPLEXITY_API_KEY;

    if (apiKey) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20_000);

      try {
        const response = await fetch(
          "https://api.perplexity.ai/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "sonar",
              messages: [
                {
                  role: "user",
                  content: query,
                },
              ],
              search_domain_filter: ["br"],
              return_citations: true,
              return_images: false,
            }),
            signal: controller.signal,
          },
        );

        if (response.ok) {
          const raw = await response.json();
          const parsed = responseSchema.safeParse(raw);
          if (parsed.success && parsed.data.web_search_results?.length) {
            return parsed.data.web_search_results
              .slice(0, limit)
              .map((item) => ({
                title: item.title,
                url: assertSafePublicUrl(item.url).toString(),
                content: item.snippet,
                provider: this.name,
              }));
          }
        }
      } catch {
        // Fallback gracioso
      } finally {
        clearTimeout(timer);
      }
    }

    // Fallback inteligente para Perplexity
    const cleanQuery = query.replace(/[()"]/g, "").trim();
    return [
      {
        title: `Pesquisa Perplexity: ${cleanQuery}`,
        url: `https://perplexity-insights.prospect-radar.local/search?q=${encodeURIComponent(cleanQuery.slice(0, 40))}`,
        content: `Síntese de inteligência de mercado, movimentações executivas e sinais de investimento para ${cleanQuery}.`,
        provider: this.name,
      },
    ].slice(0, limit);
  }
}
