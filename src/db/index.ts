import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

let instance: NeonHttpDatabase<typeof schema> | null = null;
export function getDb() {
  if (instance) return instance;
  const url = process.env.DATABASE_URL;
  if (!url)
    throw new Error(
      "DATABASE_URL não configurada. Use o modo demonstração ou configure o Neon.",
    );
  instance = drizzle(neon(url), { schema });
  return instance;
}
export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}
