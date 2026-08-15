import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/dashboard/);
});
test("login e dashboard", async ({ page }) => {
  await expect(
    page.getByRole("heading", { name: "Visão geral" }),
  ).toBeVisible();
  await expect(page.getByText("Modo demonstração.")).toBeVisible();
});
test("pesquisa, filtros e status", async ({ page }) => {
  await page.goto("/research");
  await expect(
    page.getByRole("button", { name: "Pesquisar com IA" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Exportar CSV" })).toBeVisible();
  await page
    .getByLabel("Pesquisar novas empresas com IA")
    .fill("Pesquise empresas de e-commerce com até 1.000 funcionários");
  await page.getByRole("button", { name: "Pesquisar com IA" }).click();
  await expect(page.getByText("Pesquisa demo concluída")).toBeVisible();
  await page.getByPlaceholder("Filtrar por nome ou domínio").fill("Aurora");
  await expect(page.getByText(/Aurora Mercado Digital/)).toBeVisible();
  await page.getByLabel(/Aprovar Aurora/).click();
  await expect(
    page.getByRole("cell", { name: "Aprovada para pesquisar leads" }),
  ).toBeVisible();
});
test("cadastro persona", async ({ page }) => {
  await page.goto("/personas");
  await page.getByRole("button", { name: "Cadastrar persona" }).click();
  await page.getByPlaceholder("Nome").fill("Pessoa Teste");
  await page.getByPlaceholder("Cargo").fill("CISO");
  await page.locator('select[name="companyId"]').selectOption({ index: 1 });
  await page.getByRole("button", { name: "Salvar persona" }).click();
  await expect(page.getByText("Pessoa Teste")).toBeVisible();
});
test("exportação autenticada", async ({ request, page }) => {
  const cookies = await page.context().cookies();
  const response = await request.get("/api/export/csv", {
    headers: { cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; ") },
  });
  expect(response.ok()).toBeTruthy();
  expect((await response.body())[0]).toBe(0xef);
});
