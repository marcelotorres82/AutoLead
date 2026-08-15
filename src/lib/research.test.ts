import { describe, expect, it } from "vitest";
import { cronAuthorized, runDailyResearch } from "@/lib/research";
describe("cron", () => {
  it("autentica bearer", () => {
    expect(cronAuthorized("Bearer segredo", "segredo")).toBe(true);
    expect(cronAuthorized("segredo", "segredo")).toBe(false);
  });
  it("executa modo demo", async () =>
    expect((await runDailyResearch("2099-01-01", true)).status).toBe(
      "completed",
    ));
});
