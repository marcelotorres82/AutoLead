import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ env: { EXA_API_KEY: "exa-test-key" } }));

import { ExaSearchProvider } from "@/lib/providers/exa";

describe("ExaSearchProvider", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("converte resultados com texto e descarta itens sem lastro", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              title: "Empresa Exemplo",
              url: "https://example.com/noticia",
              text: "Conteúdo público extraído da página.",
              publishedDate: "2026-08-24",
            },
            {
              title: "Sem conteúdo",
              url: "https://example.org/vazio",
              text: null,
              publishedDate: null,
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      new ExaSearchProvider().search("varejo Brasil", 40),
    ).resolves.toEqual([
      {
        title: "Empresa Exemplo",
        url: "https://example.com/noticia",
        content: "Conteúdo público extraído da página.",
        publishedAt: "2026-08-24",
        provider: "exa",
      },
    ]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      query: "varejo Brasil",
      numResults: 25,
      contents: { text: { maxCharacters: 3000 } },
    });
  });

  it("descarta URLs privadas retornadas pelo provedor", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            results: [
              {
                title: "Host privado",
                url: "http://127.0.0.1/admin",
                text: "Não deve entrar no pipeline.",
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    await expect(new ExaSearchProvider().search("teste")).resolves.toEqual([]);
  });
});
