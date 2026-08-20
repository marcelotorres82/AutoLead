import { z } from "zod";

export const companySignalsSchema = z.object({
  employeeScale: z.enum([
    "unknown",
    "micro",
    "small",
    "medium",
    "large",
    "enterprise",
  ]),
  digitalPresence: z.enum(["none", "basic", "multi_channel", "high_scale"]),
  transactionalExposure: z.enum(["none", "limited", "significant", "critical"]),
  recentGrowth: z.enum(["none", "weak", "strong"]),
  hasPublicApis: z.boolean(),
  hasMobileOrWebApps: z.boolean(),
  hasCloudFootprint: z.boolean(),
  hasSecurityHiring: z.boolean(),
  hasDistributedWorkloads: z.boolean(),
  handlesSensitiveData: z.boolean(),
  evidenceQuality: z.enum(["low", "medium", "high"]),
});
export type CompanySignals = z.infer<typeof companySignalsSchema>;
