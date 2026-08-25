import type { SearchResult } from "@/lib/providers/types";

export function sanitizeExternalText(value: string, maxLength = 4_000) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeSearchResult(result: SearchResult): SearchResult {
  return {
    ...result,
    title: sanitizeExternalText(result.title, 300),
    content: sanitizeExternalText(result.content),
  };
}
