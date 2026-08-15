import OpenAI from "openai";
import { env } from "@/lib/env";
import { aiBatchResultSchema } from "@/lib/domain";
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
    const response = await client.responses.create({
      model: env.OPENAI_MODEL,
      input: `Analise candidatos fictícios/públicos sem inferir vulnerabilidades. Separe fatos, sinais e hipóteses. Retorne JSON compatível com o schema solicitado. Fontes:\n${JSON.stringify(results.slice(0, 50))}`,
    });
    const parsed = JSON.parse(response.output_text);
    return aiBatchResultSchema.parse(parsed).companies;
  }
}
