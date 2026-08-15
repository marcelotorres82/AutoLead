import "server-only";

import { z } from "zod";
import {
  aiBatchAnalysisSchema,
  normalizeDomain,
  normalizeName,
} from "@/lib/domain";
import { env } from "@/lib/env";
import type { AiProvider, SearchResult } from "@/lib/providers/types";

const responseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({
          parts: z.array(z.object({ text: z.string() })).min(1),
        }),
      }),
    )
    .min(1),
});

const systemInstruction =
  "Você é um analista de inteligência comercial B2B. Identifique empresas brasileiras reais somente com base nas fontes fornecidas. Nunca afirme vulnerabilidades, incidentes ou exposição técnica. Separe fatos confirmados, sinais comerciais e hipóteses. Cada evidência deve apontar para uma URL exatamente presente nas fontes. Se não houver evidência suficiente, não inclua a empresa. Sugira aderência a API Security, WAAP ou Guardicore e use pontuação conservadora.";

export function geminiResponseJsonSchema() {
  const schema = z.toJSONSchema(aiBatchAnalysisSchema, { target: "draft-7" });
  const expensiveConstraints = new Set([
    "$schema",
    "additionalProperties",
    "exclusiveMaximum",
    "exclusiveMinimum",
    "format",
    "maxItems",
    "maxLength",
    "maximum",
    "minItems",
    "minLength",
    "minimum",
    "pattern",
  ]);
  const simplify = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(simplify);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !expensiveConstraints.has(key))
        .map(([key, item]) => [key, simplify(item)]),
    );
  };
  return simplify(schema);
}

export class GeminiAiProvider implements AiProvider {
  readonly name = "gemini";

  async analyzeBatch(results: SearchResult[]) {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");
    const selected = results.slice(0, 50);
    const chunkSize = Math.ceil(selected.length / 3);
    const chunks = Array.from({ length: 3 }, (_, index) =>
      selected.slice(index * chunkSize, (index + 1) * chunkSize),
    ).filter((chunk) => chunk.length > 0);
    const batches = await Promise.all(
      chunks.map((chunk) => this.analyzeChunk(chunk, apiKey)),
    );
    return Array.from(
      new Map(
        batches
          .flat()
          .map((company) => [
            normalizeDomain(company.domain) || normalizeName(company.name),
            company,
          ]),
      ).values(),
    ).slice(0, 30);
  }

  private async analyzeChunk(results: SearchResult[], apiKey: string) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Selecione até 10 empresas inéditas e priorizáveis. Analise estas fontes públicas:\n${JSON.stringify(results)}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: geminiResponseJsonSchema(),
          temperature: 0.2,
          maxOutputTokens: 12_000,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      signal: AbortSignal.timeout(35_000),
    });
    const raw = await response.text();
    if (!response.ok) {
      let detail = "erro não detalhado";
      try {
        const message = z
          .object({ error: z.object({ message: z.string() }) })
          .safeParse(JSON.parse(raw || "{}"));
        if (message.success) detail = message.data.error.message;
      } catch {
        // The provider can return a non-JSON proxy error.
      }
      throw new Error(`Gemini retornou ${response.status}: ${detail}`);
    }
    const parsedResponse = responseSchema.parse(JSON.parse(raw));
    const text = parsedResponse.candidates[0].content.parts
      .map((part) => part.text)
      .join("");
    return aiBatchAnalysisSchema.parse(JSON.parse(text)).companies;
  }
}
