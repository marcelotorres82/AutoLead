import { z } from "zod";
const envSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  TAVILY_API_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().default("gpt-5-mini"),
  CRON_SECRET: z.string().min(24).optional(),
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD_HASH: z.string().min(20).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});
export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL || undefined,
  TAVILY_API_KEY: process.env.TAVILY_API_KEY || undefined,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || undefined,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || undefined,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  CRON_SECRET: process.env.CRON_SECRET || undefined,
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN || undefined,
  AUTH_SECRET: process.env.AUTH_SECRET || undefined,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || undefined,
  ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH || undefined,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});
export const demoMode = !(
  env.DATABASE_URL &&
  env.TAVILY_API_KEY &&
  (env.GEMINI_API_KEY || env.OPENAI_API_KEY)
);
export function integrationStatus() {
  return {
    database: Boolean(env.DATABASE_URL),
    tavily: Boolean(env.TAVILY_API_KEY),
    gemini: Boolean(env.GEMINI_API_KEY),
    openai: Boolean(env.OPENAI_API_KEY),
    blob: Boolean(env.BLOB_READ_WRITE_TOKEN),
    authentication: Boolean(
      env.AUTH_SECRET && env.ADMIN_EMAIL && env.ADMIN_PASSWORD_HASH,
    ),
  };
}
