import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { verticals, settings, lushaUsage } from "../src/db/schema";
import { verticalNames } from "../src/lib/demo-data";
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL é obrigatória para o seed");
const db = drizzle(neon(url));
for (const name of verticalNames)
  await db
    .insert(verticals)
    .values({ name, description: `Vertical inicial: ${name}` })
    .onConflictDoNothing();
await db
  .insert(settings)
  .values([
    { key: "dailyGoal", value: 30 },
    { key: "weeklyGoal", value: 150 },
    { key: "exclusionDays", value: 90 },
    { key: "maxSearchesPerRun", value: 16 },
    { key: "maxAiCallsPerRun", value: 3 },
  ])
  .onConflictDoNothing();
await db
  .insert(lushaUsage)
  .values({
    month: new Date().toISOString().slice(0, 7) + "-01",
    limit: 300,
    used: 0,
  })
  .onConflictDoNothing();
console.log("Seed idempotente concluído.");
