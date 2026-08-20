import {
  scoreBreakdownSchema,
  solutions,
  type ScoreBreakdown,
  type Solution,
} from "@/lib/domain";
import {
  companySignalsSchema,
  type CompanySignals,
} from "@/lib/company-signals";

const employeePoints: Record<CompanySignals["employeeScale"], number> = {
  unknown: 0,
  micro: 2,
  small: 5,
  medium: 9,
  large: 12,
  enterprise: 15,
};
const digitalPoints: Record<CompanySignals["digitalPresence"], number> = {
  none: 0,
  basic: 6,
  multi_channel: 13,
  high_scale: 20,
};
const transactionalPoints: Record<
  CompanySignals["transactionalExposure"],
  number
> = {
  none: 0,
  limited: 5,
  significant: 10,
  critical: 15,
};
const growthPoints: Record<CompanySignals["recentGrowth"], number> = {
  none: 0,
  weak: 6,
  strong: 15,
};
const evidencePoints: Record<CompanySignals["evidenceQuality"], number> = {
  low: 1,
  medium: 3,
  high: 5,
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function calculateCompanyScores(input: CompanySignals): {
  solution: Solution;
  scores: Record<Solution, number>;
  breakdown: ScoreBreakdown;
} {
  const signals = companySignalsSchema.parse(input);
  const digital = digitalPoints[signals.digitalPresence];
  const transactional = transactionalPoints[signals.transactionalExposure];
  const employees = employeePoints[signals.employeeScale];
  const evidence = evidencePoints[signals.evidenceQuality];

  const scores: Record<Solution, number> = {
    "API Security": clampScore(
      (signals.hasPublicApis ? 30 : 0) +
        (signals.hasMobileOrWebApps ? 20 : 0) +
        transactional * 1.3 +
        (signals.handlesSensitiveData ? 15 : 0) +
        evidence * 3,
    ),
    WAAP: clampScore(
      digital * 1.5 +
        (signals.hasMobileOrWebApps ? 15 : 0) +
        transactional * 1.65 +
        (signals.hasCloudFootprint ? 10 : 0) +
        (signals.handlesSensitiveData ? 10 : 0) +
        evidence * 2,
    ),
    Guardicore: clampScore(
      (signals.hasDistributedWorkloads ? 30 : 0) +
        (signals.hasCloudFootprint ? 20 : 0) +
        (signals.handlesSensitiveData ? 20 : 0) +
        employees +
        (signals.hasSecurityHiring ? 10 : 0) +
        evidence,
    ),
  };
  const solution = solutions.reduce((best, current) =>
    scores[current] > scores[best] ? current : best,
  );
  const breakdown = scoreBreakdownSchema.parse({
    verticalFit: 20,
    sizeComplexity: employees,
    digitalPresence: digital,
    transactionalChannels: transactional,
    recentSignals: growthPoints[signals.recentGrowth],
    solutionFit: Math.round(scores[solution] / 10),
    evidenceQuality: evidence,
  });
  return { solution, scores, breakdown };
}
