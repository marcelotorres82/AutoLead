import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { assertSafePublicUrl } from "@/lib/security";
import type { SearchResult, WebSearchProvider } from "@/lib/providers/types";
import { PublicWebSearchProvider } from "@/lib/providers/public-search";
import { z } from "zod";

const claudeSearchResponseSchema = z.object({
  results: z.array(
    z.object({
      title: z.string(),
      url: z.string().url(),
      content: z.string(),
    }),
  ),
});

export class AnthropicSearchProvider implements WebSearchProvider {
  readonly name = "anthropic-search";
  private publicSearch = new PublicWebSearchProvider();

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    const apiKey = env.ANTHROPIC_API_KEY;

    if (apiKey) {
      try {
        // Obter fontes web públicas preliminares
        const rawWebResults = await this.publicSearch.search(query, 12);
        
        const client = new Anthropic({ apiKey });
        const prompt = `Você é um motor de busca especializado em empresas brasileiras B2B.
Analise a consulta: "${query}".
Fontes públicas encontradas: ${JSON.stringify(rawWebResults)}.

REGRAS:
1. Filtre e retorne apenas empresas brasileiras REAIS compatíveis com a busca.
2. NUNCA inclua empresas do setor financeiro, bancos, fintechs, meios de pagamento ou maquininhas (ex: Stone, Cielo, PagSeguro, Nubank são estritamente proibidas).
3. Priorize URLs oficiais das empresas (sites institucionais, .com.br, /contato, /sobre, vagas).

Retorne um JSON com a estrutura:
{
  "results": [
    {
      "title": "Nome da Empresa - Título da Página",
      "url": "https://www.empresa.com.br",
      "content": "Resumo do core business real da empresa e evidência da atividade"
    }
  ]
}`;

        const response = await client.messages.create({
          model: env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022",
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }],
        });

        let text = "";
        for (const block of response.content) {
          if (block.type === "text") {
            text = block.text;
            break;
          }
        }

        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = claudeSearchResponseSchema.safeParse(JSON.parse(match[0]));
          if (parsed.success && parsed.data.results.length > 0) {
            const safeResults: SearchResult[] = [];
            for (const item of parsed.data.results) {
              try {
                const safeUrl = assertSafePublicUrl(item.url).toString();
                safeResults.push({
                  title: item.title,
                  url: safeUrl,
                  content: item.content,
                  provider: this.name,
                });
              } catch {
                // Ignorar URLs inseguras ou privadas
              }
            }
            if (safeResults.length > 0) {
              return safeResults.slice(0, limit);
            }
          }
        }
      } catch (error) {
        console.warn("Anthropic search provider fallback:", error);
      }
    }

    // Se não houver chave ou falhar, usa o motor público diretamente
    return this.publicSearch.search(query, limit);
  }
}
