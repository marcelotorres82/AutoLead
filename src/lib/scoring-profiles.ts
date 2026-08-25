import type { EvidenceFirstScores } from "@/lib/evidence-intelligence";
import type { Solution } from "@/lib/domain";

export const DEFAULT_SCORING_PROFILE_VERSION = "prospect-v2.0";

type Profile = {
  name: string;
  version: string;
  solutionWeights: Record<Solution, number>;
  digitalWeight: number;
  minimumEvidence: number;
  minimumIndependentSources: number;
};

const defaultProfile: Profile = {
  name: "Evidence First padrão",
  version: DEFAULT_SCORING_PROFILE_VERSION,
  solutionWeights: { "API Security": 1, WAAP: 1, Guardicore: 1 },
  digitalWeight: 1,
  minimumEvidence: 3,
  minimumIndependentSources: 1,
};

const profileOverrides: Partial<Record<string, Partial<Profile>>> = {
  Retail: {
    solutionWeights: { "API Security": 1, WAAP: 1.1, Guardicore: 0.9 },
  },
  "Video Media": {
    solutionWeights: { "API Security": 1.05, WAAP: 1.05, Guardicore: 0.9 },
  },
  "Federal and Central": {
    solutionWeights: { "API Security": 1, WAAP: 0.9, Guardicore: 1.1 },
  },
  "State, Regional and Local": {
    solutionWeights: { "API Security": 1, WAAP: 0.9, Guardicore: 1.1 },
  },
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoringProfileFor(vertical: string): Profile {
  const override = profileOverrides[vertical];
  return {
    ...defaultProfile,
    ...override,
    solutionWeights:
      override?.solutionWeights ?? defaultProfile.solutionWeights,
  };
}

export function applyScoringProfile(
  scores: EvidenceFirstScores,
  vertical: string,
): EvidenceFirstScores & { profileName: string; profileVersion: string } {
  const profile = scoringProfileFor(vertical);
  const apiSecurityScore = clamp(
    scores.apiSecurityScore * profile.solutionWeights["API Security"],
  );
  const waapScore = clamp(scores.waapScore * profile.solutionWeights.WAAP);
  const guardicoreScore = clamp(
    scores.guardicoreScore * profile.solutionWeights.Guardicore,
  );
  const best = Math.max(apiSecurityScore, waapScore, guardicoreScore);
  const evidencePenalty =
    scores.evidenceCount < profile.minimumEvidence ||
    scores.independentSourceCount < profile.minimumIndependentSources
      ? 10
      : 0;
  return {
    ...scores,
    apiSecurityScore,
    waapScore,
    guardicoreScore,
    opportunityScore: clamp(
      best * 0.7 +
        scores.digitalExposureScore * 0.3 * profile.digitalWeight -
        evidencePenalty,
    ),
    profileName: profile.name,
    profileVersion: profile.version,
  };
}
