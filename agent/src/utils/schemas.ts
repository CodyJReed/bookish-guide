import { z } from "zod";
// legal contract between backend -> ai models -> frontend
// save cost ->
export const WebSearchResultSchema = z.object({
  title: z.string().min(1),
  url: z.url(),
  snippet: z.string().optional().default(""),
});

// Cap token usage by limiting return scope
export const WebSearchResultsSchema = z.array(WebSearchResultSchema).max(10);

export type WebSearchResult = z.infer<typeof WebSearchResultsSchema>
