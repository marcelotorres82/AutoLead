import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL é obrigatória para migrations");
await migrate(drizzle(neon(url)), { migrationsFolder: "drizzle" });
console.log("Migrations aplicadas.");
