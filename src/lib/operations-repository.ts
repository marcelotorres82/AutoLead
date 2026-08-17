import "server-only";

import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { lushaUsage, personas, verticals } from "@/db/schema";
import type { Persona, VerticalView } from "@/lib/operations-types";
import { verticalTaxonomy } from "@/lib/domain";

export async function listPersonas(): Promise<Persona[]> {
  const rows = await getDb()
    .select()
    .from(personas)
    .orderBy(asc(personas.name));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    title: row.title,
    companyId: row.companyId,
    profileUrl: row.profileUrl ?? undefined,
    seniority: row.seniority ?? "Não informado",
    area: row.area ?? "Não informado",
    solution: row.solution ?? "WAAP",
    priority: row.priority ?? 2,
    role: row.role ?? "Influenciador",
    lushaCreditUsed: row.lushaCreditUsed ?? false,
    sentToSalesloft: row.sentToSalesloft ?? false,
    notes: row.notes ?? undefined,
  }));
}

export async function createPersona(
  input: Omit<Persona, "id" | "lushaCreditUsed" | "sentToSalesloft">,
) {
  const [row] = await getDb()
    .insert(personas)
    .values({
      companyId: input.companyId,
      name: input.name,
      title: input.title,
      profileUrl: input.profileUrl || null,
      seniority: input.seniority,
      area: input.area,
      solution:
        input.solution === "API Security" ||
        input.solution === "WAAP" ||
        input.solution === "Guardicore"
          ? input.solution
          : "WAAP",
      priority: input.priority,
      role: input.role,
      notes: input.notes || null,
    })
    .returning();
  return (await listPersonas()).find((item) => item.id === row.id)!;
}

function currentMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export async function getLushaUsage() {
  const month = currentMonth();
  const [row] = await getDb()
    .select()
    .from(lushaUsage)
    .where(eq(lushaUsage.month, month))
    .limit(1);
  return { used: row?.used ?? 0, limit: row?.limit ?? 300 };
}

export async function setLushaUsage(used: number) {
  const month = currentMonth();
  const [row] = await getDb()
    .insert(lushaUsage)
    .values({ month, used, limit: 300 })
    .onConflictDoUpdate({
      target: lushaUsage.month,
      set: { used, updatedAt: new Date() },
    })
    .returning();
  return { used: row.used, limit: row.limit };
}

export async function listVerticals(): Promise<VerticalView[]> {
  const rows = await getDb()
    .select()
    .from(verticals)
    .orderBy(asc(verticals.name));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    subverticals:
      row.name in verticalTaxonomy
        ? verticalTaxonomy[row.name as keyof typeof verticalTaxonomy]
        : [],
    active: row.active,
  }));
}

export async function setVerticalActive(id: string, active: boolean) {
  const [row] = await getDb()
    .update(verticals)
    .set({ active, updatedAt: new Date() })
    .where(eq(verticals.id, id))
    .returning();
  return row ? { id: row.id, name: row.name, active: row.active } : null;
}
