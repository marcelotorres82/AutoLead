import { describe, expect, it } from "vitest";
import {
  buildB2BTargetedQueries,
  extractCnpjsFromText,
  extractEmployeeRangeFromSnippet,
  parseDirectoryOrLinkedInSource,
} from "@/lib/brazil-b2b-enrichment";

describe("brazil-b2b-enrichment", () => {
  it("extrai CNPJs formatados e numéricos com contexto", () => {
    const cnpjs = extractCnpjsFromText(
      "Empresa Braspress Transportes CNPJ 48.740.351/0001-65 e filial cnpj: 12345678000199",
    );
    expect(cnpjs).toContain("48740351000165");
    expect(cnpjs).toContain("12345678000199");
  });

  it("extrai faixa de funcionários de snippets do LinkedIn e diretórios", () => {
    expect(
      extractEmployeeRangeFromSnippet(
        "Empresa com 1.001-5.000 funcionários em São Paulo, Brasil.",
      ),
    ).toBe("1.001-5.000");
    expect(
      extractEmployeeRangeFromSnippet(
        "Mais de 2.500 colaboradores em todo o território nacional.",
      ),
    ).toBe("2.500+");
  });

  it("interpreta páginas corporativas do LinkedIn e diretórios Econodata/CNPJ.biz", () => {
    const linkedinParsed = parseDirectoryOrLinkedInSource({
      title: "Jamef Encomendas Urgentes | LinkedIn",
      url: "https://br.linkedin.com/company/jamef-encomendas-urgentes",
      content:
        "Jamef Encomendas Urgentes | 1.001-5.000 funcionários | Sede em São Paulo, SP. Acesse jamef.com.br.",
    });
    expect(linkedinParsed).toMatchObject({
      companyName: "Jamef Encomendas Urgentes",
      inferredDomain: "jamef.com.br",
      employees: "1.001-5.000",
      sourceKind: "linkedin",
    });

    const econodataParsed = parseDirectoryOrLinkedInSource({
      title: "Braspress Transportes Urgentes - CNPJ 48.740.351/0001-65 | Econodata",
      url: "https://www.econodata.com.br/consulta-empresa/48740351000165-braspress",
      content:
        "Braspress Transportes Urgentes localizada em Guarulhos, SP com mais de 5.000 funcionários. Site: braspress.com.br.",
    });
    expect(econodataParsed).toMatchObject({
      companyName: "Braspress Transportes Urgentes",
      inferredDomain: "braspress.com.br",
      cnpj: "48740351000165",
      sourceKind: "directory",
    });
  });

  it("gera queries direcionadas para LinkedIn e diretórios corporativos", () => {
    const queries = buildB2BTargetedQueries(
      "https://www.linkedin.com/company/mattos-filho",
    );
    expect(queries[0]).toContain("site:linkedin.com/company/mattos-filho");
  });
});
