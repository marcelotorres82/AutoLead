import "server-only";

import { assertSafePublicUrl } from "@/lib/security";
import type { SearchResult, WebSearchProvider } from "@/lib/providers/types";

export class PublicWebSearchProvider implements WebSearchProvider {
  readonly name = "public-search";

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
        {
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; ProspectRadar/2.0; public-search)",
            Accept: "text/html,application/xhtml+xml",
            "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.7",
          },
          signal: controller.signal,
        },
      );
      if (!response.ok) return [];
      return this.parseDuckDuckGoHtml(await response.text(), limit);
    } catch {
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  private parseDuckDuckGoHtml(html: string, limit: number): SearchResult[] {
    const results: SearchResult[] = [];
    const linkRegex =
      /<a class="result__url"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetRegex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    const titleRegex = /<a class="result__a"[^>]*>([\s\S]*?)<\/a>/gi;
    const urls: string[] = [];
    const titles: string[] = [];
    const snippets: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(html)) !== null) {
      try {
        let rawUrl = match[1].trim();
        if (rawUrl.startsWith("//duckduckgo.com/l/?uddg=")) {
          const redirect = new URL(`https:${rawUrl}`);
          rawUrl = decodeURIComponent(redirect.searchParams.get("uddg") ?? "");
        } else if (rawUrl.startsWith("/l/?uddg=")) {
          const redirect = new URL(`https://duckduckgo.com${rawUrl}`);
          rawUrl = decodeURIComponent(redirect.searchParams.get("uddg") ?? "");
        }
        if (rawUrl.startsWith("http"))
          urls.push(assertSafePublicUrl(rawUrl).toString());
      } catch {
        // Resultado inseguro ou malformado é descartado isoladamente.
      }
    }
    while ((match = titleRegex.exec(html)) !== null)
      titles.push(match[1].replace(/<[^>]+>/g, "").trim());
    while ((match = snippetRegex.exec(html)) !== null)
      snippets.push(match[1].replace(/<[^>]+>/g, "").trim());

    for (
      let index = 0;
      index < urls.length && results.length < limit;
      index += 1
    )
      results.push({
        title: titles[index] || `Resultado público ${index + 1}`,
        url: urls[index],
        content:
          snippets[index] || titles[index] || "Resultado público sem resumo.",
        provider: this.name,
      });
    return results;
  }
}
