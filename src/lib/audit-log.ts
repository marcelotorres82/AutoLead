import "server-only";

import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/db";
import { auditLogs, users } from "@/db/schema";

export function hashIpAddress(ip?: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip.trim()).digest("hex").slice(0, 32);
}

export async function ensureUserRecord(
  email: string,
  name = "Administrador",
): Promise<string | null> {
  if (!isDatabaseConfigured()) return null;
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;
  try {
    const db = getDb();
    const inserted = await db
      .insert(users)
      .values({
        email: normalizedEmail,
        name: name.trim() || "Administrador",
        active: true,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          name: name.trim() || "Administrador",
          updatedAt: new Date(),
        },
      })
      .returning({ id: users.id });
    if (inserted[0]?.id) return inserted[0].id;
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);
    return existing?.id ?? null;
  } catch {
    return null;
  }
}

export async function recordAuditLog(input: {
  actorEmail?: string | null;
  actorName?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}) {
  if (!isDatabaseConfigured()) return;
  try {
    const userId = input.actorEmail
      ? await ensureUserRecord(
          input.actorEmail,
          input.actorName ?? "Administrador",
        )
      : null;
    await getDb()
      .insert(auditLogs)
      .values({
        userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        metadata: {
          ...input.metadata,
          actorEmail: input.actorEmail ?? undefined,
        },
        ipHash: hashIpAddress(input.ip),
      });
  } catch {
    // Falha de telemetria/auditoria não deve interromper o fluxo principal
  }
}
