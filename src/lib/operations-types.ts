export type Persona = {
  id: string;
  name: string;
  title: string;
  companyId: string;
  profileUrl?: string;
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
