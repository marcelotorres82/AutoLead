import { z } from "zod";
const envSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  EXA_API_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().default("gemini-3.5-flash-lite"),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_MODEL: z.string().default("claude-3-5-sonnet-20241022"),
  PERPLEXITY_API_KEY: z.string().min(1).optional(),
  PERPLEXITY_MODEL: z.string().default("sonar"),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().default("gpt-5-mini"),
  LLM_PROVIDER: z
    .enum(["auto", "gemini", "anthropic", "openai"])
    .default("gemini"),
  LLM_MODEL: z.string().min(1).optional(),
  RESEARCH_DEBUG: z.enum(["true", "false"]).default("false"),
  CRON_SECRET: z.string().min(24).optional(),
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(16).optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD_HASH: z.string().min(1).optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  ALLOWED_GOOGLE_EMAILS: z.string().default("marcelotorres1982@gmail.com"),
  TELEGRAM_BOT_TOKEN: z.string().min(20).optional(),
  TELEGRAM_CHAT_ID: z
    .string()
    .regex(/^-?\d+$/)
    .optional(),
  TELEGRAM_WEBHOOK_SECRET: z
    .string()
    .min(16)
    .max(256)
    .regex(/^[A-Za-z0-9_-]+$/)
    .optional(),
  APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});
export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL?.trim() || undefined,
  EXA_API_KEY: process.env.EXA_API_KEY?.trim() || undefined,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY?.trim() || undefined,
  GEMINI_MODEL: process.env.GEMINI_MODEL?.trim() || undefined,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY?.trim() || undefined,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL?.trim() || undefined,
  PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY?.trim() || undefined,
  PERPLEXITY_MODEL: process.env.PERPLEXITY_MODEL?.trim() || undefined,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY?.trim() || undefined,
  OPENAI_MODEL: process.env.OPENAI_MODEL?.trim() || undefined,
  LLM_PROVIDER: process.env.LLM_PROVIDER?.trim() || undefined,
  LLM_MODEL: process.env.LLM_MODEL?.trim() || undefined,
  RESEARCH_DEBUG: process.env.RESEARCH_DEBUG?.trim() || undefined,
  CRON_SECRET: process.env.CRON_SECRET?.trim() || undefined,
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN?.trim() || undefined,
  AUTH_SECRET: process.env.AUTH_SECRET?.trim() || undefined,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL?.trim() || undefined,
  ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH?.trim() || undefined,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD?.trim() || undefined,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID?.trim() || undefined,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET?.trim() || undefined,
  ALLOWED_GOOGLE_EMAILS:
    process.env.ALLOWED_GOOGLE_EMAILS?.trim() || "marcelotorres1982@gmail.com",
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN?.trim() || undefined,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID?.trim() || undefined,
  TELEGRAM_WEBHOOK_SECRET:
    process.env.TELEGRAM_WEBHOOK_SECRET?.trim() || undefined,
  APP_URL: process.env.APP_URL?.trim() || undefined,
  NEXT_PUBLIC_APP_URL:
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    undefined,
});
export const demoMode = !(
  env.DATABASE_URL &&
  env.EXA_API_KEY &&
  env.GEMINI_API_KEY
);
export function llmModelFor(
  provider: "gemini" | "anthropic" | "openai",
  fallback: string,
) {
  return env.LLM_PROVIDER === provider && env.LLM_MODEL
    ? env.LLM_MODEL
    : fallback;
}
export function integrationStatus() {
  const googleOAuth = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  const passwordAuth = Boolean(env.ADMIN_EMAIL && env.ADMIN_PASSWORD_HASH);
  return {
    database: Boolean(env.DATABASE_URL),
    exa: Boolean(env.EXA_API_KEY),
    gemini: Boolean(env.GEMINI_API_KEY),
    blob: Boolean(env.BLOB_READ_WRITE_TOKEN),
    googleOAuth,
    authentication: Boolean(env.AUTH_SECRET && (googleOAuth || passwordAuth)),
    telegram: Boolean(
      env.TELEGRAM_BOT_TOKEN &&
      env.TELEGRAM_CHAT_ID &&
      env.TELEGRAM_WEBHOOK_SECRET,
    ),
  };
}
