import { describe, expect, it } from "vitest";
import { classifyWebsiteUrl } from "@/lib/website-intelligence";

describe("website intelligence URL classifier", () => {
  it.each([
    ["https://example.com/", "home"],
    ["https://example.com/solutions/security", "product"],
    ["https://example.com/developers/api", "docs"],
    ["https://example.com/careers", "careers"],
    ["https://example.com/noticias/expansao", "news"],
    ["https://example.com/sobre", "company"],
  ])("classifica %s como %s", (url, category) => {
    expect(classifyWebsiteUrl(url)).toBe(category);
  });
});
