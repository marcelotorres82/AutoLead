import { describe, expect, it } from "vitest";
import {
  assertSafePublicUrl,
  isOfficialCompanySource,
  isPublicCompanyDomain,
} from "@/lib/security";

describe("URLs públicas", () => {
  it("rejeita hosts locais, reservados e redes privadas", () => {
    for (const url of [
      "https://prospect-radar.local/fonte",
      "https://empresa.test",
      "http://172.20.0.1/admin",
      "http://100.64.0.1/",
      "https://user:secret@example.com/",
    ])
      expect(() => assertSafePublicUrl(url)).toThrow();
  });

  it("aceita domínio público e exige fonte no site oficial", () => {
    expect(isPublicCompanyDomain("empresa.com.br")).toBe(true);
    expect(
      isOfficialCompanySource(
        "empresa.com.br",
        "https://institucional.empresa.com.br/sobre",
      ),
    ).toBe(true);
    expect(
      isOfficialCompanySource(
        "empresa.com.br",
        "https://linkedin.com/company/empresa",
      ),
    ).toBe(false);
  });
});
