import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { aiBatchAnalysisSchema } from "@/lib/domain";
import { env } from "@/lib/env";
import type { AiProvider, SearchResult } from "@/lib/providers/types";

export class OpenAiProvider implements AiProvider {
  readonly name = "openai";

  async analyzeBatch(results: SearchResult[]) {
    if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY não configurada");
    const client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      timeout: 30_000,
      maxRetries: 2,
    });
    const response = await client.responses.parse({
      model: env.OPENAI_MODEL,
      input: [
        {
          role: "system",
          content:
            "Você é um analista de inteligência comercial B2B. Identifique empresas brasileiras reais somente com base nas fontes fornecidas. Nunca afirme vulnerabilidades, incidentes ou exposição técnica. Separe fatos confirmados, sinais comerciais e hipóteses. Cada evidência deve apontar para uma URL exatamente presente nas fontes. Se não houver evidência suficiente, não inclua a empresa. Sugira aderência a API Security, WAAP ou Guardicore e use pontuação conservadora.",
        },
        {
          role: "user",
          content: `Selecione até 30 empresas inéditas e priorizáveis. Analise estas fontes públicas:\n${JSON.stringify(results.slice(0, 50))}`,
        },
      ],
      text: {
        format: zodTextFormat(aiBatchAnalysisSchema, "prospect_radar_batch"),
      },
    });
    if (!response.output_parsed)
      throw new Error("OpenAI não retornou análise estruturada");
    return response.output_parsed.companies;
  }
}
