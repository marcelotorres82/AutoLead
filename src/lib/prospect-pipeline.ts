import {
  buildEvidenceRecord,
  calculateEvidenceFirstScores,
  detectTechnicalSignals,
  passesEvidenceGate,
  recommendedSolutionFromScores,
  type EvidenceRecord,
  type TechnicalSignal,
} from "@/lib/evidence-intelligence";
import { normalizeDomain, normalizeName, type Solution } from "@/lib/domain";
import type { SearchResult } from "@/lib/providers/types";

export type CompanyCandidate = {
  name: string;
  domain?: string;
  website?: string;
  city?: string;
  state?: string;
  country?: string;
  industry?: string;
  discoverySource: string;
  discoveryUrl?: string;
  discoveredAt: Date;
};

export class DiscoveryEngine {
  discover(results: SearchResult[]): CompanyCandidate[] {
    return results.flatMap((result) => {
      try {
        const url = new URL(result.url);
        return [
          {
            name: result.title.trim(),
            domain: normalizeDomain(url.hostname),
            website: url.origin,
            discoverySource: result.provider ?? "search",
            discoveryUrl: result.url,
            discoveredAt: new Date(),
          },
        ];
      } catch {
        return [];
      }
    });
  }
}

export class NormalizationEngine {
  normalize(candidate: CompanyCandidate): CompanyCandidate {
    return {
      ...candidate,
      name: candidate.name.replace(/\s+/g, " ").trim(),
      domain: normalizeDomain(candidate.domain ?? candidate.website ?? ""),
      website: candidate.website
        ? new URL(candidate.website).origin
        : candidate.website,
      city: candidate.city?.trim(),
      state: candidate.state?.trim().toUpperCase(),
    };
  }

  deduplicate(candidates: CompanyCandidate[]) {
    const seenDomains = new Set<string>();
    const seenNames = new Set<string>();
    return candidates.filter((candidate) => {
      const domain = normalizeDomain(candidate.domain ?? "");
      const name = normalizeName(candidate.name);
      if ((domain && seenDomains.has(domain)) || seenNames.has(name))
        return false;
      if (domain) seenDomains.add(domain);
      seenNames.add(name);
      return true;
    });
  }
}

export class EnrichmentEngine {
  enrich(results: SearchResult[]): { technicalSignals: TechnicalSignal[] } {
    return { technicalSignals: detectTechnicalSignals(results) };
  }
}

export class EvidenceEngine {
  collect(
    claims: Array<{
      claim: string;
      kind: "fact" | "signal" | "hypothesis";
      sourceUrl: string;
    }>,
    results: SearchResult[],
    companyDomain?: string,
  ): EvidenceRecord[] {
    const byUrl = new Map(results.map((result) => [result.url, result]));
    return claims.flatMap((claim) => {
      const result = byUrl.get(claim.sourceUrl);
      return result
        ? [buildEvidenceRecord({ ...claim, result, companyDomain })]
        : [];
    });
  }
}

export class CompanyResearchEngine {
  research(input: {
    evidence: EvidenceRecord[];
    technicalSignals: TechnicalSignal[];
  }) {
    const scores = calculateEvidenceFirstScores(
      input.evidence,
      input.technicalSignals,
    );
    const recommendedSolution = recommendedSolutionFromScores(scores);
    return {
      scores,
      recommendedSolution,
      gate: passesEvidenceGate(scores, input.evidence, recommendedSolution),
    };
  }
}

export type SDRIntelligence = {
  recommendedSolution: Solution;
  whyNow: string;
  callOpening: string;
  discoveryQuestions: string[];
  likelyChallenges: string[];
  relevantEvidenceIds: string[];
  recommendedPersonas: string[];
  hypothesis: string;
  confidence: number;
};

const personasBySolution: Record<Solution, string[]> = {
  "API Security": [
    "CISO",
    "Application Security",
    "Cybersecurity Manager",
    "Cloud Security",
    "CTO",
  ],
  WAAP: [
    "CISO",
    "Head of Security",
    "Application Security",
    "IT Manager",
    "CTO",
  ],
  Guardicore: [
    "Infrastructure Manager",
    "Network Manager",
    "Cybersecurity Manager",
    "Datacenter Manager",
    "CISO",
  ],
};

export class SDRIntelligenceEngine {
  interpret(input: {
    solution: Solution;
    evidence: Array<EvidenceRecord & { id: string }>;
    confidence: number;
  }): SDRIntelligence | null {
    const relevant = input.evidence
      .filter(
        (item) =>
          item.statementKind === "FACT" &&
          item.verified &&
          item.relevantSolutions.includes(input.solution),
      )
      .sort(
        (a, b) =>
          b.freshnessScore +
          b.sourceQuality -
          (a.freshnessScore + a.sourceQuality),
      );
    const strongest = relevant[0];
    if (!strongest) return null;
    const question =
      input.solution === "Guardicore"
        ? "Como vocês avaliam hoje a segmentação entre workloads e ambientes críticos?"
        : input.solution === "WAAP"
          ? "Como vocês protegem e observam hoje as aplicações públicas e seus fluxos críticos?"
          : "Como vocês fazem hoje descoberta e monitoramento comportamental das APIs?";
    return {
      recommendedSolution: input.solution,
      whyNow: strongest.claim,
      callOpening: `Vi a evidência pública “${strongest.claim}”. Gostaria de entender como esse cenário é tratado hoje.`,
      discoveryQuestions: [question],
      likelyChallenges: [
        "Hipótese a validar: o crescimento do cenário evidenciado pode aumentar a complexidade operacional.",
      ],
      relevantEvidenceIds: relevant.slice(0, 4).map((item) => item.id),
      recommendedPersonas: personasBySolution[input.solution],
      hypothesis:
        "Hipótese comercial baseada apenas nas evidências listadas; validar na conversa antes de tratar como fato.",
      confidence: input.confidence,
    };
  }
}
