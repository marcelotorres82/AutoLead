import { z } from "zod";
import { env } from "@/lib/env";
import { assertSafePublicUrl } from "@/lib/security";
import type { SearchResult, WebSearchProvider } from "@/lib/providers/types";

const responseSchema = z.object({
  results: z.array(
    z.object({
      title: z.string().nullish(),
      url: z.string().url(),
      text: z.string().nullish(),
      publishedDate: z.string().nullish(),
    }),
  ),
});

export class ExaSearchProvider implements WebSearchProvider {
  readonly name = "exa";

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    if (!env.EXA_API_KEY) throw new Error("EXA_API_KEY não configurada");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch("https://api.exa.ai/search", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.EXA_API_KEY,
        },
        body: JSON.stringify({
          query,
          numResults: Math.min(limit, 25),
          type: "auto",
          contents: { text: { maxCharacters: 3000 } },
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Exa respondeu ${response.status}`);
      return responseSchema
        .parse(await response.json())
        .results.flatMap((item) => {
          if (!item.text) return [];
          try {
            return [
              {
                title: item.title ?? item.url,
                url: assertSafePublicUrl(item.url).toString(),
                content: item.text,
                publishedAt: item.publishedDate ?? undefined,
                provider: this.name,
              },
            ];
          } catch {
            return [];
          }
        });
    } finally {
      clearTimeout(timer);
    }
  }
}
