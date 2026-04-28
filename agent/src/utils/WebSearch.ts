// scrap/search internet tool
import { WebSearchResultSchema, WebSearchResultsSchema } from "./schemas";
import { env } from "../shared/env";
import { safeText } from ".";

// provide user query
export async function webSearch(q: string) {
  const query = (q ?? "").trim();

  if (!query) return [];

  return await searchTavilyUtil(query);
}

async function searchTavilyUtil(query: string) {
  if (!env.TAVILY_API_KEY) {
    throw new Error("TAVILY_API_KEY is missing.");
  }

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.TAVILY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      search_depth: "basic",
      max_results: 5,
      include_answer: false,
      include_images: false,
    }),
  });

  if (!res.ok) {
    const text = await safeText(res);
    throw new Error(`Tavily error, ${res.status} - ${text}`);
  }

  const data = await res.json();
  const results = Array.isArray(data?.results) ? data.results : [];

  const formatted = results.slice(0, 5).map((r: any) =>
    WebSearchResultSchema.parse({
      title: String(r?.title ?? "").trim() || "Untitled",
      url: String(r?.url ?? "").trim(),
      snippet: String(r?.content ?? "")
        .trim()
        .slice(0, 220),
    }),
  );

  return WebSearchResultsSchema.parse(formatted);
}