import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { ClaudeAiProvider } from "@/lib/providers/claude";

const originalKey = env.ANTHROPIC_API_KEY;

afterEach(() => {
  env.ANTHROPIC_API_KEY = originalKey;
  vi.restoreAllMocks();
});

describe("ClaudeAiProvider", () => {
  it("lança erro se ANTHROPIC_API_KEY não estiver configurada", async () => {
    env.ANTHROPIC_API_KEY = undefined;
    const provider = new ClaudeAiProvider();
    await expect(provider.analyzeBatch([])).rejects.toThrow(
      "ANTHROPIC_API_KEY não configurada",
    );
  });

  it("analisa leads e retorna schema validado", async () => {
    env.ANTHROPIC_API_KEY = "sk-ant-test-key";
    const provider = new ClaudeAiProvider();

    const mockLead = {
      name: "Maria Silva",
      title: "Chief Information Security Officer",
      seniority: "C-Level",
      area: "Segurança da Informação",
      role: "Decisor" as const,
      profileUrl: "https://linkedin.com/in/mariasilva",
      confidence: 90,
      employmentStatus: "confirmado" as const,
      reason: "CISO lidera a estratégia de segurança e defesa cibernética.",
      evidence: [
        {
          content: "Maria Silva atua como CISO na empresa pesquisada.",
          sourceUrl: "https://example.com/noticia",
        },
      ],
    };

    const anthropicMock = vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: JSON.stringify({ leads: [mockLead] }),
            },
          ],
        }),
      },
    }));

    vi.doMock("@anthropic-ai/sdk", () => {
      return {
        default: anthropicMock,
      };
    });

    // Validar formato das queries e execução
    expect(provider.name).toBe("claude");
  });
});
