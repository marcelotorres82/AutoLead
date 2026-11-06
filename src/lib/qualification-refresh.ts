import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { companies } from "@/db/schema";
import { env } from "@/lib/env";
import {
  qualifyCompany,
  defaultPrecisionPolicy,
  type QualificationReport,
} from "@/lib/high-precision";
import { ExaSearchProvider } from "@/lib/providers/exa";
import { GeminiAiProvider } from "@/lib/providers/gemini";
import { sanitizeSearchResult } from "@/lib/external-content";
import { normalizeDomain } from "@/lib/domain";
/** Refresh all business evidence, not just the public site's framework fingerprints. */
export async function refreshCompanyQualification(companyId: string) {
  if (!env.EXA_API_KEY || !env.GEMINI_API_KEY)
    throw new Error("Integrações de pesquisa incompletas");
  const db = getDb();
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  if (!company || company.deletedAt) throw new Error("Empresa não encontrada");
  const metadata = (company.analysisMetadata ?? {}) as Record<
    string,
    unknown
  > & { qualification?: QualificationReport };
  const policy = metadata.qualification?.policy ?? defaultPrecisionPolicy;
  const search = new ExaSearchProvider();
  const name = JSON.stringify(company.name);
  const year = new Date().getFullYear();
  const queries = [
    `${name} site:${company.domain} funcionários integrantes employees headcount`,
    `${name} investimento cloud inteligência artificial transformação digital ${year}`,
    `${name} expansão contratação fusão novos contratos ${year}`,
    `${name} plano estratégia tecnologia IA ${policy.targetYear}`,
  ];
  const batches = await Promise.allSettled(
    queries.map((q) => search.search(q, 10)),
  );
  const sources = [
    ...new Map(
      batches
        .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
        .map((s) => [s.url, sanitizeSearchResult(s)]),
    ).values(),
  ];
  if (!sources.length)
    throw new Error(
      "Nenhuma fonte retornada; qualificação anterior preservada",
    );
  const candidates = await new GeminiAiProvider().analyzeBatch(
    sources,
    `${company.name}; porte acima de ${policy.minEmployeesExclusive} integrantes; projetos ${policy.targetYear}`,
  );
  const match = candidates.find(
    (candidate) =>
      normalizeDomain(candidate.domain) ===
      normalizeDomain(company.domain ?? ""),
  );
  const qualification = qualifyCompany({
    name: company.name,
    domain: company.domain ?? "",
    claims: match?.evidence ?? [],
    sources,
    policy,
  });
  await db
    .update(companies)
    .set({
      analysisMetadata: { ...metadata, qualification },
      score: qualification.score,
      qualificationStatus: qualification.qualified ? "READY" : "NEEDS_RESEARCH",
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId));
  return qualification;
}
