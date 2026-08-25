export type Persona = {
  id: string;
  name: string;
  title: string;
  companyId: string;
  profileUrl?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  evidence?: string;
  confidence?: number;
  employmentStatus?: string;
  reviewStatus: import("@/lib/lead-domain").LeadReviewStatus;
  originRunId?: string;
  researchedAt?: string;
  seniority: string;
  area: string;
  solution: string;
  priority: number;
  role: string;
  lushaCreditUsed: boolean;
  sentToSalesloft: boolean;
  notes?: string;
};

export type VerticalView = {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  subverticals: readonly string[];
};
