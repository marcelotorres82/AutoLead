import {
  isValidVerticalClassification,
  type Subvertical,
  type Vertical,
} from "@/lib/domain";

export type TechnologyProfile = {
  revenueModel: "services" | "product" | "mixed" | "not_applicable";
  serviceRevenuePercentage: number | null;
};

export type VerticalGateInput = TechnologyProfile & {
  vertical: string;
  subvertical: string;
  coreBusiness: string;
  classificationConfidence: number;
  forbiddenSector:
    | "none"
    | "banking"
    | "fintech"
    | "payments"
    | "insurance"
    | "investments"
    | "crypto";
  activeVerticals: ReadonlySet<string>;
};

export type VerticalGateResult = {
  accepted: boolean;
  requiresManualReview: boolean;
  reason:
    | "accepted"
    | "inactive_vertical"
    | "invalid_taxonomy_pair"
    | "insufficient_core_business_evidence"
    | "low_classification_confidence"
    | "forbidden_financial_sector"
    | "technology_wrong_vertical"
    | "technology_product_company"
    | "technology_mixed_requires_review";
  vertical?: Vertical;
  subvertical?: Subvertical;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const financialCoreBusiness =
  /\b(banco|banking|fintech|instituicao financeira|seguradora|corretora de (?:valores|investimentos)|exchange de cripto|crypto exchange)\b/i;
const technologyProductBusiness =
  /\b(saas|software as a service|fabricante de software|desenvolvedora de software|licenciamento de software|cybersecurity vendor|provedor de nuvem|cloud provider|hyperscaler)\b/i;

export function evaluateVerticalGate(
  input: VerticalGateInput,
): VerticalGateResult {
  if (!isValidVerticalClassification(input.vertical, input.subvertical))
    return {
      accepted: false,
      requiresManualReview: false,
      reason: "invalid_taxonomy_pair",
    };
  if (!input.activeVerticals.has(input.vertical))
    return {
      accepted: false,
      requiresManualReview: false,
      reason: "inactive_vertical",
    };
  if (input.coreBusiness.trim().length < 20)
    return {
      accepted: false,
      requiresManualReview: true,
      reason: "insufficient_core_business_evidence",
    };
  if (input.classificationConfidence < 85)
    return {
      accepted: false,
      requiresManualReview: true,
      reason: "low_classification_confidence",
    };
  const normalizedCoreBusiness = normalizeText(input.coreBusiness);
  if (
    input.forbiddenSector !== "none" ||
    financialCoreBusiness.test(normalizedCoreBusiness)
  )
    return {
      accepted: false,
      requiresManualReview: false,
      reason: "forbidden_financial_sector",
    };

  const isTechnologyConsulting =
    input.vertical === "Business Services" &&
    input.subvertical === "Consultoria e serviços de TI";
  const isTechnologyCompany =
    isTechnologyConsulting ||
    input.revenueModel !== "not_applicable" ||
    technologyProductBusiness.test(normalizedCoreBusiness);
  if (isTechnologyCompany) {
    if (!isTechnologyConsulting)
      return {
        accepted: false,
        requiresManualReview: false,
        reason: "technology_wrong_vertical",
      };
    if (
      input.revenueModel === "product" ||
      input.revenueModel === "not_applicable"
    )
      return {
        accepted: false,
        requiresManualReview: false,
        reason: "technology_product_company",
      };
    if (input.revenueModel === "mixed") {
      const percentage = input.serviceRevenuePercentage;
      if (percentage === null || (percentage >= 40 && percentage <= 60))
        return {
          accepted: false,
          requiresManualReview: true,
          reason: "technology_mixed_requires_review",
        };
      if (percentage < 40)
        return {
          accepted: false,
          requiresManualReview: false,
          reason: "technology_product_company",
        };
    }
  }

  return {
    accepted: true,
    requiresManualReview: false,
    reason: "accepted",
    vertical: input.vertical,
    subvertical: input.subvertical as Subvertical,
  };
}
