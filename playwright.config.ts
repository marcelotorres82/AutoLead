import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry" },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: "",
      EXA_API_KEY: "",
      GEMINI_API_KEY: "",
      ANTHROPIC_API_KEY: "",
      OPENAI_API_KEY: "",
      ADMIN_EMAIL: "",
      ADMIN_PASSWORD_HASH: "",
      AUTH_SECRET: "",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
