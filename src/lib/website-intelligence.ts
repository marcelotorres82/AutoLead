import "server-only";

import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isPrivateHostname, assertSafePublicUrl } from "@/lib/security";
import { sanitizeExternalText } from "@/lib/external-content";
import type { TechnicalSignal } from "@/lib/evidence-intelligence";

const MAX_REDIRECTS = 4;
const MAX_BODY_BYTES = 1_000_000;
const MAX_SITEMAP_URLS = 300;
const MAX_PAGES = 6;

export type WebsitePageCategory =
  | "home"
  | "product"
  | "docs"
  | "company"
  | "careers"
  | "news"
  | "contact"
  | "other";

export type WebsitePageSnapshot = {
  requestedUrl: string;
  finalUrl: string;
  category: WebsitePageCategory;
  statusCode: number;
  mimeType: string;
  contentHash: string;
  contentLength: number;
  title?: string;
  excerpt: string;
  durationMs: number;
  headers: Record<string, string>;
  signals: TechnicalSignal[];
};

export type WebsiteIntelligenceResult = {
  domain: string;
  pages: WebsitePageSnapshot[];
  signals: TechnicalSignal[];
  discoveredUrls: number;
  errors: string[];
};

type Detector = {
  type: string;
  value: string;
  confidence: number;
  test: (input: { html: string; headers: Headers; url: string }) => boolean;
};

const detectors: Detector[] = [
  {
    type: "technology",
    value: "Next.js",
    confidence: 96,
    test: ({ html }) => /__NEXT_DATA__|\/_next\//i.test(html),
  },
  {
    type: "technology",
    value: "React",
    confidence: 88,
    test: ({ html }) =>
      /data-reactroot|react(?:\.production)?\.min\.js/i.test(html),
  },
  {
    type: "technology",
    value: "Angular",
    confidence: 95,
    test: ({ html }) => /ng-version|<app-root/i.test(html),
  },
  {
    type: "technology",
    value: "Vue",
    confidence: 90,
    test: ({ html }) => /data-v-[a-f0-9]+|__VUE__/i.test(html),
  },
  {
    type: "technology",
    value: "WordPress",
    confidence: 98,
    test: ({ html }) => /wp-content|wp-includes/i.test(html),
  },
  {
    type: "technology",
    value: "Shopify",
    confidence: 98,
    test: ({ html, headers }) =>
      /cdn\.shopify\.com|shopify-section/i.test(html) ||
      headers.has("x-shopid"),
  },
  {
    type: "technology",
    value: "VTEX",
    confidence: 96,
    test: ({ html, headers }) =>
      /vtexassets|vteximg|vtex\.com/i.test(html) ||
      headers.has("x-vtex-cache-status"),
  },
  {
    type: "edge",
    value: "Cloudflare",
    confidence: 98,
    test: ({ html, headers }) =>
      headers.has("cf-ray") ||
      /cloudflare/i.test(headers.get("server") ?? "") ||
      /cdn-cgi/i.test(html),
  },
  {
    type: "edge",
    value: "Akamai",
    confidence: 95,
    test: ({ headers }) =>
      /akamai/i.test(
        `${headers.get("server")} ${headers.get("x-akamai-transformed")}`,
      ),
  },
  {
    type: "analytics",
    value: "Google Analytics",
    confidence: 95,
    test: ({ html }) => /googletagmanager\.com|gtag\(/i.test(html),
  },
  {
    type: "application",
    value: "Login or portal",
    confidence: 88,
    test: ({ html, url }) =>
      /(?:login|entrar|área do cliente|portal do cliente)/i.test(
        `${url} ${html.slice(0, 250_000)}`,
      ),
  },
  {
    type: "api",
    value: "Developer portal",
    confidence: 92,
    test: ({ html, url }) =>
      /(?:developers?|openapi|swagger|api-docs|graphql)/i.test(
        `${url} ${html.slice(0, 250_000)}`,
      ),
  },
  {
    type: "application",
    value: "E-commerce",
    confidence: 90,
    test: ({ html, url }) =>
      /(?:carrinho|checkout|add-to-cart|comprar|loja|shop|produto)/i.test(
        `${url} ${html.slice(0, 250_000)}`,
      ),
  },
];

export function classifyWebsiteUrl(value: string): WebsitePageCategory {
  const path = new URL(value).pathname.toLowerCase();
  if (path === "/" || path === "") return "home";
  if (
    /\/(?:products?|solutions?|services?|pricing|loja|shop)(?:\/|$)/.test(path)
  )
    return "product";
  if (
    /\/(?:docs?|developers?|api-docs|swagger|guides?|help)(?:\/|$)/.test(path)
  )
    return "docs";
  if (/\/(?:careers?|jobs?|vagas?)(?:\/|$)/.test(path)) return "careers";
  if (/\/(?:news|noticias|imprensa|press|blog|insights?)(?:\/|$)/.test(path))
    return "news";
  if (/\/(?:about|sobre|empresa|quem-somos|institucional)(?:\/|$)/.test(path))
    return "company";
  if (/\/(?:contact|contato|fale-conosco)(?:\/|$)/.test(path)) return "contact";
  return "other";
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function assertResolvedPublic(url: URL) {
  assertSafePublicUrl(url.toString());
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (
    !addresses.length ||
    addresses.some(({ address }) => isPrivateHostname(address))
  ) {
    throw new Error("O domínio resolveu para um endereço privado ou inválido");
  }
}

async function fetchSafe(input: string) {
  let current = assertSafePublicUrl(input);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    await assertResolvedPublic(current);
    const response = await fetch(current, {
      redirect: "manual",
      headers: {
        "user-agent":
          "ProspectRadarEvidenceBot/2.0 (+public business research)",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect sem destino");
      await response.body?.cancel();
      current = new URL(location, current);
      continue;
    }
    return { response, finalUrl: current.toString() };
  }
  throw new Error("Limite de redirects excedido");
}

async function readLimitedBody(response: Response) {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES)
    throw new Error("Conteúdo maior que o limite permitido");
  const buffer = new Uint8Array(await response.arrayBuffer());
  if (buffer.byteLength > MAX_BODY_BYTES)
    throw new Error("Conteúdo maior que o limite permitido");
  return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
}

function sitemapUrls(xml: string, origin: string) {
  const urls = Array.from(
    xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi),
    (match) => match[1].trim(),
  ).filter((value) => {
    try {
      return new URL(value).origin === origin;
    } catch {
      return false;
    }
  });
  return [...new Set(urls)].slice(0, MAX_SITEMAP_URLS);
}

function selectResearchUrls(home: URL, discovered: string[]) {
  const priority: WebsitePageCategory[] = [
    "docs",
    "product",
    "careers",
    "news",
    "company",
  ];
  const selected = [home.toString()];
  for (const category of priority) {
    const match = discovered.find(
      (url) => classifyWebsiteUrl(url) === category,
    );
    if (match) selected.push(match);
  }
  return [...new Set(selected)].slice(0, MAX_PAGES);
}

function detectSignals(
  html: string,
  headers: Headers,
  url: string,
): TechnicalSignal[] {
  const detectedAt = new Date().toISOString();
  return detectors
    .filter((detector) => detector.test({ html, headers, url }))
    .map((detector) => ({
      type: detector.type,
      value: detector.value,
      sourceUrl: url,
      detectionMethod: "website" as const,
      confidence: detector.confidence,
      detectedAt,
    }));
}

async function snapshotPage(
  requestedUrl: string,
): Promise<WebsitePageSnapshot> {
  const started = Date.now();
  const { response, finalUrl } = await fetchSafe(requestedUrl);
  const mimeType =
    response.headers.get("content-type")?.split(";")[0] ?? "unknown";
  if (
    !mimeType.includes("html") &&
    !mimeType.includes("xml") &&
    !mimeType.startsWith("text/")
  ) {
    throw new Error(`Tipo de conteúdo não permitido: ${mimeType}`);
  }
  const body = await readLimitedBody(response);
  const title = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const safeTitle = title ? sanitizeExternalText(title, 300) : undefined;
  const excerpt = sanitizeExternalText(body, 2_000);
  const headers = Object.fromEntries(
    [
      "server",
      "cf-ray",
      "x-powered-by",
      "x-vtex-cache-status",
      "content-security-policy",
    ]
      .map((key) => [key, response.headers.get(key)])
      .filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
  return {
    requestedUrl,
    finalUrl,
    category: classifyWebsiteUrl(finalUrl),
    statusCode: response.status,
    mimeType,
    contentHash: hash(body),
    contentLength: new TextEncoder().encode(body).byteLength,
    title: safeTitle,
    excerpt,
    durationMs: Date.now() - started,
    headers,
    signals: detectSignals(body, response.headers, finalUrl),
  };
}

export async function inspectCompanyWebsite(
  domain: string,
): Promise<WebsiteIntelligenceResult> {
  const normalized = domain
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const home = assertSafePublicUrl(`https://${normalized}`);
  const errors: string[] = [];
  let discovered: string[] = [];
  const sitemapCandidates = ["/sitemap.xml", "/sitemap_index.xml"];
  try {
    const { response } = await fetchSafe(
      new URL("/robots.txt", home).toString(),
    );
    if (response.ok) {
      const robots = await readLimitedBody(response);
      sitemapCandidates.unshift(
        ...Array.from(
          robots.matchAll(/^sitemap:\s*(https?:\/\/\S+)/gim),
          (match) => match[1],
        ),
      );
    }
  } catch (error) {
    errors.push(
      `robots.txt: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  for (const sitemapPath of sitemapCandidates) {
    try {
      const sitemapUrl = sitemapPath.startsWith("http")
        ? sitemapPath
        : new URL(sitemapPath, home).toString();
      const { response, finalUrl } = await fetchSafe(sitemapUrl);
      if (!response.ok) continue;
      discovered = sitemapUrls(
        await readLimitedBody(response),
        new URL(finalUrl).origin,
      );
      const nestedSitemaps = discovered
        .filter((url) => /sitemap[^/]*\.xml(?:$|\?)/i.test(url))
        .slice(0, 4);
      if (nestedSitemaps.length) {
        const nested = await Promise.allSettled(
          nestedSitemaps.map(async (url) => {
            const child = await fetchSafe(url);
            return sitemapUrls(
              await readLimitedBody(child.response),
              new URL(child.finalUrl).origin,
            );
          }),
        );
        discovered = nested.flatMap((item) =>
          item.status === "fulfilled" ? item.value : [],
        );
      }
      if (discovered.length) break;
    } catch (error) {
      errors.push(
        `sitemap ${sitemapPath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  const pages: WebsitePageSnapshot[] = [];
  for (const url of selectResearchUrls(home, discovered)) {
    try {
      pages.push(await snapshotPage(url));
    } catch (error) {
      errors.push(
        `${url}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  const signals = Array.from(
    new Map(
      pages
        .flatMap((page) => page.signals)
        .map((signal) => [`${signal.type}:${signal.value}`, signal]),
    ).values(),
  );
  return {
    domain: home.hostname,
    pages,
    signals,
    discoveredUrls: discovered.length,
    errors,
  };
}
