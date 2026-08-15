import { demoCompanies } from "@/lib/demo-data";
const running = new Set<string>();
export function cronAuthorized(header: string | null, secret?: string) {
  return Boolean(secret && header === `Bearer ${secret}`);
}
export async function runDailyResearch(date: string, demo = false) {
  if (running.has(date))
    return { status: "duplicate" as const, date, created: 0 };
  running.add(date);
  const started = Date.now();
  try {
    if (demo)
      return {
        status: "completed" as const,
        date,
        created: Math.min(30, demoCompanies.length),
        durationMs: Date.now() - started,
        provider: "demo",
        estimatedCost: 0,
      };
    throw new Error("Execução real requer banco e provedores configurados");
  } finally {
    running.delete(date);
  }
}
