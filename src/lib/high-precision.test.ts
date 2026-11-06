import { describe, expect, it } from "vitest";
import {
  qualifyCompany,
  legalValidationPolicy,
  isCurrentQualification,
  quoteHeadcounts,
  policyForCriteria,
  type PrecisionClaim,
} from "./high-precision";
const now = new Date("2026-11-06T04:00:00Z");
const quotes = [
  "Example Legal has 1200 employees working in its global offices.",
  "Example Legal implemented cloud and artificial intelligence across its internal operations.",
  "Example Legal opened a new office and hired 50 professionals this year.",
  "Example Legal plans to implement its cloud and artificial intelligence strategy in 2027.",
];
const claims: PrecisionClaim[] = [
  "headcount",
  "technology",
  "growth",
  "roadmap",
].map((criterion, i) => ({
  criterion: criterion as PrecisionClaim["criterion"],
  quote: quotes[i],
  sourceUrl: `https://example.legal/news/${i}`,
  ...(i === 0 ? { headcount: 1200 } : {}),
}));
const sources = claims.map((claim, i) => ({
  url: claim.sourceUrl,
  title: "Company announcement",
  content: quotes[i],
  publishedAt: "2026-10-01",
}));
const input = {
  name: "Example Legal",
  domain: "example.legal",
  claims,
  sources,
  policy: legalValidationPolicy,
  now,
};
describe("high precision qualification", () => {
  it("accepts all four evidenced criteria and exposes citations and dates", () => {
    const result = qualifyCompany(input);
    expect(result.qualified).toBe(true);
    expect(result.score).toBe(100);
    expect(result.breakdown.roadmap.evidence[0].publishedAt).toBe(
      "2026-10-01T00:00:00.000Z",
    );
  });
  it.each([0, 1, 2, 3])("rejects a missing mandatory criterion %s", (i) => {
    expect(
      qualifyCompany({
        ...input,
        claims: claims.filter((_, index) => index !== i),
      }).qualified,
    ).toBe(false);
  });
  it("rejects fabricated quotes despite a known URL", () => {
    expect(
      qualifyCompany({
        ...input,
        claims: claims.map((c) => ({
          ...c,
          quote:
            "Fabricated statement about adoption of artificial intelligence in 2027.",
        })),
      }).score,
    ).toBe(0);
  });
  it.each(["", "2026-11-07", "2026-02-30", "2020-01-01"])(
    "rejects missing, future, invalid and stale dates: %s",
    (publishedAt) => {
      expect(
        qualifyCompany({
          ...input,
          sources: sources.map((s) => ({ ...s, publishedAt })),
        }).qualified,
      ).toBe(false);
    },
  );
  it("does not accept exactly 1000 people or a range upper bound", () => {
    expect(
      quoteHeadcounts("There are 501–1000 employees and 1001-5000 employees."),
    ).toEqual([]);
    const quote =
      "Example Legal has 1000 employees working in its global offices.";
    expect(
      qualifyCompany({
        ...input,
        claims: [{ ...claims[0], quote, headcount: 1000 }, ...claims.slice(1)],
        sources: [{ ...sources[0], content: quote }, ...sources.slice(1)],
      }).qualified,
    ).toBe(false);
  });
  it("does not count revenue, clients or approximate headcounts", () => {
    expect(
      quoteHeadcounts("1200 clients and approximately 1500 employees"),
    ).toEqual([]);
  });
  it("does not count an unrelated third party", () => {
    const alien = sources.map((s) => ({
      ...s,
      url: s.url.replace("example.legal", "news.test"),
      content: s.content.replaceAll("Example Legal", "Another Firm"),
    }));
    expect(
      qualifyCompany({
        ...input,
        sources: alien,
        claims: claims.map((c, i) => ({
          ...c,
          sourceUrl: alien[i].url,
          quote: alien[i].content,
        })),
      }).qualified,
    ).toBe(false);
  });
  it("does not extrapolate a project into 2027", () => {
    const updatedSources = sources.map((s) => ({
      ...s,
      content: s.content.replace("2027", "2026"),
    }));
    expect(
      qualifyCompany({
        ...input,
        sources: updatedSources,
        claims: claims.map((c, i) => ({
          ...c,
          quote: updatedSources[i].content,
        })),
      }).qualified,
    ).toBe(false);
  });
  it.each([
    "Example Legal advised clients implementing cloud strategy in 2027.",
    "Example Legal has no plans to implement cloud technology in 2027.",
    "Example Legal explains regulatory plans for artificial intelligence in 2027.",
  ])("rejects advice, negation and regulation as own roadmap: %s", (quote) => {
    const result = qualifyCompany({
      ...input,
      claims: [...claims.slice(0, 3), { ...claims[3], quote }],
      sources: [...sources.slice(0, 3), { ...sources[3], content: quote }],
    });
    expect(result.qualified).toBe(false);
    expect(result.breakdown.roadmap.score).toBe(0);
  });
  it("rejects dates invented by the model instead of accepting source mismatches", () => {
    const result = qualifyCompany({
      ...input,
      claims: claims.map((claim) => ({ ...claim, publishedAt: "2026-11-01" })),
    });
    expect(result.score).toBe(0);
  });
  it("never upgrades legacy flags and expires growth evidence", () => {
    expect(isCurrentQualification(undefined, now)).toBe(false);
    expect(
      isCurrentQualification(qualifyCompany(input), new Date("2027-10-03")),
    ).toBe(false);
  });
  it("parses strict greater-than policy", () => {
    expect(
      policyForCriteria("Escritórios com mais de 1.000 funcionários")
        .minEmployeesExclusive,
    ).toBe(1000);
  });
  it("deduplicates quotes without increasing scores", () => {
    const result = qualifyCompany({ ...input, claims: [...claims, ...claims] });
    expect(result.score).toBe(100);
    expect(result.breakdown.technology.evidence).toHaveLength(1);
  });
});
