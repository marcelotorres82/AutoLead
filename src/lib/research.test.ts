import { describe, expect, it } from "vitest";
import {
  buildSearchQueries,
  cronAuthorized,
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
});
