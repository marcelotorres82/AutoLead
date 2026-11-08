import type { SearchResult } from "@/lib/providers/types";

export interface BrasilApiCnpjData {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnaeFiscalDescricao: string;
  porte: string;
  municipio: string;
  uf: string;
  situacaoCadastral: string;
  capitalSocial: number;
  qsa: string[];
}

export interface ParsedDirectoryCompany {
  companyName: string;
  tradeName: string;
  inferredDomain: string;
  linkedinUrl: string;
  employees: string;
  city: string;
  state: string;
  cnpj?: string;
  sourceKind: "linkedin" | "directory";
}

const directoryHostnames = [
  "econodata.com.br",
  "cnpj.biz",
  "casadosdados.com.br",
  "solutudo.com.br",
];

export function isB2BDirectoryHost(hostname: string): boolean {
  const clean = hostname.toLowerCase().replace(/^www\./, "");
  return directoryHostnames.some(
    (dir) => clean === dir || clean.endsWith(`.${dir}`),
  );
}

export function extractCnpjsFromText(text: string): string[] {
  const found = new Set<string>();
  const formattedRegex = /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g;
  for (const match of text.matchAll(formattedRegex)) {
    const digits = match[0].replace(/\D/g, "");
    if (digits.length === 14 && !/^(\d)\1{13}$/.test(digits)) {
      found.add(digits);
    }
  }
  const urlOrLabelRegex = /(?:cnpj|empresa|consulta)[^\d]{0,15}(\d{14})\b/gi;
  for (const match of text.matchAll(urlOrLabelRegex)) {
    const digits = match[1];
    if (digits && digits.length === 14 && !/^(\d)\1{13}$/.test(digits)) {
      found.add(digits);
    }
  }
  return Array.from(found);
}

export async function fetchBrasilApiCnpj(
  rawCnpj: string,
): Promise<BrasilApiCnpjData | null> {
  const digits = rawCnpj.replace(/\D/g, "");
  if (digits.length !== 14) return null;
  try {
    const response = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${digits}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "AutoLead-ProspectRadar/2.0",
        },
        signal: AbortSignal.timeout(4_500),
      },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as Record<string, unknown>;
    const razaoSocial =
      typeof data.razao_social === "string" ? data.razao_social.trim() : "";
    if (!razaoSocial) return null;
    const nomeFantasia =
      typeof data.nome_fantasia === "string" && data.nome_fantasia.trim()
        ? data.nome_fantasia.trim()
        : razaoSocial;
    const situacao =
      typeof data.descricao_situacao_cadastral === "string"
        ? data.descricao_situacao_cadastral.trim()
        : "ATIVA";
    const qsaRaw = Array.isArray(data.qsa) ? data.qsa : [];
    const qsa = qsaRaw
      .map((member) => {
        if (!member || typeof member !== "object") return null;
        const m = member as Record<string, unknown>;
        return typeof m.nome_socio === "string" ? m.nome_socio.trim() : null;
      })
      .filter((name): name is string => Boolean(name))
      .slice(0, 6);

    return {
      cnpj: digits,
      razaoSocial,
      nomeFantasia,
      cnaeFiscalDescricao:
        typeof data.cnae_fiscal_descricao === "string"
          ? data.cnae_fiscal_descricao.trim()
          : "",
      porte:
        typeof data.porte === "string" && data.porte.trim()
          ? data.porte.trim()
          : "Média/Grande",
      municipio:
        typeof data.municipio === "string" ? data.municipio.trim() : "São Paulo",
      uf: typeof data.uf === "string" ? data.uf.trim() : "SP",
      situacaoCadastral: situacao,
      capitalSocial:
        typeof data.capital_social === "number" ? data.capital_social : 0,
      qsa,
    };
  } catch {
    return null;
  }
}

export function extractEmployeeRangeFromSnippet(text: string): string | null {
  const rangeMatch = text.match(
    /\b(\d{1,3}(?:[.,]\d{3})*\s*[-–—a]\s*\d{1,3}(?:[.,]\d{3})*|\d{1,3}(?:[.,]\d{3})+\+)\s*(?:funcion[aá]rios|colaboradores|integrantes|employees)/i,
  );
  if (rangeMatch?.[1]) {
    return rangeMatch[1].replace(/\s+/g, "");
  }
  const singleMatch = text.match(
    /\b(?:mais de|acima de|cerca de|over)\s*(\d{1,3}(?:[.,]\d{3})+|\d{3,})\s*(?:funcion[aá]rios|colaboradores|integrantes|employees)/i,
  );
  if (singleMatch?.[1]) {
    return `${singleMatch[1]}+`;
  }
  return null;
}

function slugifyCompanyToDomain(name: string): string {
  const stopWords = new Set([
    "sa",
    "ltda",
    "limitada",
    "brasil",
    "brazil",
    "grupo",
    "companhia",
    "cia",
    "empresa",
    "servicos",
    "logistica",
    "transportes",
    "comercio",
    "participacoes",
    "holding",
    "eireli",
    "me",
    "epp",
  ]);
  const tokens = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !stopWords.has(token));
  const core = (tokens.slice(0, 2).join("") || tokens[0] || "empresa").replace(
    /[^a-z0-9]/g,
    "",
  );
  return `${core}.com.br`;
}

function extractExplicitDomainFromText(text: string): string | null {
  const match = text.match(
    /\b(?:https?:\/\/)?(?:www\.)?([a-z0-9][a-z0-9-]{2,40}\.com\.br)\b/i,
  );
  if (!match?.[1]) return null;
  const candidate = match[1].toLowerCase();
  if (isB2BDirectoryHost(candidate) || candidate.endsWith("linkedin.com")) {
    return null;
  }
  return candidate;
}

export function parseDirectoryOrLinkedInSource(
  result: SearchResult,
): ParsedDirectoryCompany | null {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(result.url);
  } catch {
    return null;
  }
  const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
  const combined = `${result.title} ${result.content}`;
  const employees = extractEmployeeRangeFromSnippet(combined) ?? "1.000+";
  const cnpjs = extractCnpjsFromText(`${result.url} ${combined}`);

  // 1. LinkedIn Company Page
  if (
    (hostname === "linkedin.com" || hostname.endsWith(".linkedin.com")) &&
    /\/company\/([^/?#]+)/i.test(parsedUrl.pathname)
  ) {
    const slugMatch = parsedUrl.pathname.match(/\/company\/([^/?#]+)/i);
    const slug = slugMatch?.[1] ?? "";
    if (!slug || slug.length < 2) return null;
    const cleanedTitle = result.title
      .replace(/\s*[|\-–—]\s*LinkedIn.*$/i, "")
      .replace(/^LinkedIn\s*[|\-–—]\s*/i, "")
      .trim();
    const companyName =
      cleanedTitle.length >= 2 && cleanedTitle.length <= 90
        ? cleanedTitle
        : slug
            .replace(/[-_]+/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
    const explicitDomain = extractExplicitDomainFromText(combined);
    const cleanSlug = slug
      .toLowerCase()
      .replace(/-(brasil|br|oficial|official|latam)$/i, "")
      .replace(/[^a-z0-9]/g, "");
    const inferredDomain =
      explicitDomain ||
      (cleanSlug.length >= 3
        ? `${cleanSlug}.com.br`
        : slugifyCompanyToDomain(companyName));

    return {
      companyName,
      tradeName: companyName,
      inferredDomain,
      linkedinUrl: result.url.startsWith("https://") ? result.url : "",
      employees,
      city: "São Paulo",
      state: "SP",
      cnpj: cnpjs[0],
      sourceKind: "linkedin",
    };
  }

  // 2. Brazilian B2B Directories (Econodata, CNPJ.biz, Casa dos Dados, Solutudo)
  if (isB2BDirectoryHost(hostname)) {
    const cleanedTitle = result.title
      .replace(
        /\s*[|\-–—]\s*(?:Econodata|CNPJ\.biz|Casa dos Dados|Solutudo|Consulta Empresa).*$/i,
        "",
      )
      .replace(/\s*[-–—]\s*CNPJ\s*[\d./-]+.*$/i, "")
      .replace(/^Empresa\s+/i, "")
      .trim();
    if (
      !cleanedTitle ||
      cleanedTitle.length < 3 ||
      cleanedTitle.length > 100 ||
      /^(ranking|lista|maiores empresas|consulta de cnpj|empresas de )/i.test(
        cleanedTitle,
      )
    ) {
      return null;
    }
    const explicitDomain = extractExplicitDomainFromText(combined);
    const inferredDomain =
      explicitDomain ?? slugifyCompanyToDomain(cleanedTitle);

    return {
      companyName: cleanedTitle,
      tradeName: cleanedTitle,
      inferredDomain,
      linkedinUrl: "",
      employees,
      city: "São Paulo",
      state: "SP",
      cnpj: cnpjs[0],
      sourceKind: "directory",
    };
  }

  return null;
}

export function buildB2BTargetedQueries(criteria?: string): string[] {
  const requested = criteria?.trim();
  if (!requested) return [];

  // Check if user pasted a LinkedIn company URL directly
  const linkedinMatch = requested.match(
    /linkedin\.com\/company\/([a-zA-Z0-9_-]+)/i,
  );
  if (linkedinMatch?.[1]) {
    const slug = linkedinMatch[1].replace(/[-_]+/g, " ");
    return [
      `site:linkedin.com/company/${linkedinMatch[1]} Brasil`,
      `"${slug}" Brasil site oficial .com.br funcionários`,
      `"${slug}" site:econodata.com.br OR site:cnpj.biz`,
    ];
  }

  // Check if user included a specific CNPJ
  const cnpjs = extractCnpjsFromText(requested);
  if (cnpjs.length > 0) {
    return [
      `CNPJ ${cnpjs[0]} empresa Brasil site oficial`,
      `${cnpjs[0]} site:cnpj.biz OR site:econodata.com.br`,
    ];
  }

  return [
    `${requested} Brasil site:br.linkedin.com/company funcionários`,
    `${requested} Brasil site:econodata.com.br OR site:cnpj.biz funcionários`,
  ];
}
