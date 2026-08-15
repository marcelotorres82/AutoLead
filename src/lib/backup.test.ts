import { describe, expect, it } from "vitest";
import { backupSchema, createBackup } from "@/lib/backup";
describe("backup", () =>
  it("gera hash e schema válidos", () => {
    const b = createBackup({
      filters: {},
      companies: [{}],
      evidence: [],
      personas: [],
      history: [],
    });
    expect(b.sha256).toHaveLength(64);
    expect(backupSchema.parse(b.payload).schemaVersion).toBe("1.0");
  }));
