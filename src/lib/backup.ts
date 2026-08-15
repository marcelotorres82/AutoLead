import { createHash } from "node:crypto";
import { z } from "zod";

export const backupSchema = z.object({
  schemaVersion: z.literal("1.0"),
  exportedAt: z.string().datetime(),
  filters: z.record(z.string(), z.unknown()),
  companies: z.array(z.unknown()),
  evidence: z.array(z.unknown()),
  personas: z.array(z.unknown()),
  history: z.array(z.unknown()),
});
export function createBackup(
  data: Omit<z.infer<typeof backupSchema>, "schemaVersion" | "exportedAt">,
) {
  const payload = {
    schemaVersion: "1.0" as const,
    exportedAt: new Date().toISOString(),
    ...data,
  };
  const json = JSON.stringify(payload);
  return {
    payload,
    json,
    sha256: createHash("sha256").update(json).digest("hex"),
    size: Buffer.byteLength(json),
    records: payload.companies.length + payload.personas.length,
  };
}
