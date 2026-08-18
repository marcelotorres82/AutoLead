import type { AnalyzedCompany } from "@/lib/domain";
import type { AnalyzedLead, LeadResearchContext } from "@/lib/lead-domain";
export type SearchResult = {
  title: string;
  url: string;
  content: string;
  publishedAt?: string;
  provider?: string;
};
export type CompanyInventoryItem = {
  name: string;
  tradeName?: string;
  domain: string;
  aliases: string[];
};
export interface WebSearchProvider {
  readonly name: string;
  search(query: string, limit?: number): Promise<SearchResult[]>;
}
export interface AiProvider {
  readonly name: string;
  analyzeBatch(
    results: SearchResult[],
    criteria?: string,
    inventory?: CompanyInventoryItem[],
  ): Promise<AnalyzedCompany[]>;
  analyzeLeads(
    results: SearchResult[],
    context: LeadResearchContext,
    existing: Array<{ name: string; profileUrl: string | null }>,
  ): Promise<AnalyzedLead[]>;
}
export interface BackupStorage {
  put(path: string, body: string): Promise<{ pathname: string; size: number }>;
}
