import { describe, expect, it } from "vitest";
import {
  buildSearchQueries,
  cronAuthorized,
  mergeSearchResults,
  runDailyResearch,
} from "@/lib/research";
describe("cron", () => {
  it("autentica bearer", () => {
    expect(cronAuthorized("Bearer segredo", "segredo")).toBe(true);
    expect(cronAuthorized("segredo", "segredo")).toBe(false);
  });
  it("executa modo demo", async () =>
    expect((await runDailyResearch("2099-01-01", true)).status).toBe(
      "completed",
    ));
  it("cria buscas públicas orientadas pelo critério e pelo LinkedIn", () => {
    const queries = buildSearchQueries(
      "empresas de e-commerce com até 1.000 funcionários",
    );
    expect(queries).toHaveLength(4);
    expect(queries).toContain(
      "empresas de e-commerce com até 1.000 funcionários Brasil site:linkedin.com/company",
    );
  });
  it("inclui as subverticais na pesquisa padrão", () => {
    expect(buildSearchQueries(undefined, ["Video Media"])[0]).toContain(
      "Workflow de vídeo e OVP OR Transmissão/broadcast OR OTT",
    );
  });
  it("intercala consultas e remove URLs canônicas repetidas", () => {
    const result = (title: string, url: string) => ({
      title,
      url,
      content: title,
    });
    expect(
      mergeSearchResults(
        [
          [
            result("A1", "https://a.example/empresa?utm_source=teste"),
            result("A2", "https://a.example/outra"),
          ],
          [
            result("B1", "https://b.example/empresa"),
            result("A1 repetida", "https://a.example/empresa#sobre"),
          ],
        ],
        10,
      ).map((item) => item.title),
    ).toEqual(["A1", "B1", "A2"]);
  });
});
