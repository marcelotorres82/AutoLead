import { describe, expect, it } from "vitest";
import { generateCsv, safeCsvCell } from "@/lib/csv";
describe("CSV", () => {
  it("usa BOM e escapa conteúdo", () => {
    const csv = generateCsv([{ nome: 'A, "B"', nota: "linha\nnova" }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"A, ""B"""');
  });
  it("protege contra injection", () =>
    expect(safeCsvCell("=HYPERLINK(1)")).toBe('"\'=HYPERLINK(1)"'));
});
