import { describe, expect, it } from "vitest";
import { geminiResponseJsonSchema } from "@/lib/providers/gemini";

describe("Gemini", () => {
  it("gera JSON Schema compatível sem metadado de draft", () => {
    const schema = geminiResponseJsonSchema();
    expect(schema).not.toHaveProperty("$schema");
    expect(schema).toMatchObject({
      type: "object",
      properties: { companies: { type: "array" } },
      required: ["companies"],
    });
  });
});
