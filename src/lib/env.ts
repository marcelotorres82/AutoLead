import { z } from "zod";
const envSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  EXA_API_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().default("gemini-3.1-flash-lite"),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_MODEL: z.string().default("claude-3-5-sonnet-20241022"),
  PERPLEXITY_API_KEY: z.string().min(1).optional(),
  PERPLEXITY_MODEL: z.string().default("sonar"),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().default("gpt-5-mini"),
  LLM_PROVIDER: z
    .enum(["auto", "gemini", "anthropic", "openai"])
    .default("auto"),
  LLM_MODEL: z.string().min(1).optional(),
  RESEARCH_DEBUG: z.enum(["true", "false"]).default("false"),
  CRON_SECRET: z.string().min(24).optional(),
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD_HASH: z.string().min(20).optional(),
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
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});
export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL || undefined,
  EXA_API_KEY: process.env.EXA_API_KEY || undefined,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || undefined,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || undefined,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
  PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY || undefined,
  PERPLEXITY_MODEL: process.env.PERPLEXITY_MODEL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || undefined,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  LLM_PROVIDER: process.env.LLM_PROVIDER,
  LLM_MODEL: process.env.LLM_MODEL || undefined,
  RESEARCH_DEBUG: process.env.RESEARCH_DEBUG,
  CRON_SECRET: process.env.CRON_SECRET || undefined,
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN || undefined,
  AUTH_SECRET: process.env.AUTH_SECRET || undefined,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || undefined,
  ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH || undefined,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || undefined,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || undefined,
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET || undefined,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});
export const demoMode = !(
  env.DATABASE_URL &&
  env.EXA_API_KEY &&
  (env.GEMINI_API_KEY || env.ANTHROPIC_API_KEY || env.OPENAI_API_KEY)
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
  return {
    database: Boolean(env.DATABASE_URL),
    exa: Boolean(env.EXA_API_KEY),
    perplexity: Boolean(env.PERPLEXITY_API_KEY),
    gemini: Boolean(env.GEMINI_API_KEY),
    anthropic: Boolean(env.ANTHROPIC_API_KEY),
    openai: Boolean(env.OPENAI_API_KEY),
    blob: Boolean(env.BLOB_READ_WRITE_TOKEN),
    authentication: Boolean(
      env.AUTH_SECRET && env.ADMIN_EMAIL && env.ADMIN_PASSWORD_HASH,
    ),
    telegram: Boolean(
      env.TELEGRAM_BOT_TOKEN &&
      env.TELEGRAM_CHAT_ID &&
      env.TELEGRAM_WEBHOOK_SECRET,
    ),
  };
}
