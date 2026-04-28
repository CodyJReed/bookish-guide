import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";
import { webSearch } from "../utils/webSearch";
import { openUrl } from "../utils/openUrl";
import { summarize } from "../utils/summarize";
import { candidate } from "./types";
import { getChatModel } from "../shared/models";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const setTopResults = 5;
// Set up the Runnable sequence...

// Step 1 take the validated query and routeStrategy...
export const webSearchStep = RunnableLambda.from(
  async (input: { q: string; mode: "web" | "direct" }) => {
    // ...and execute a Tavily web search
    const res = await webSearch(input.q);

    // return original input along with formatted and validated,
    // results...
    return {
      ...input,
      res,
    };
  },
);

// Step 2 Take input results and...
export const openAndSummarizeStep = RunnableLambda.from(
  async (input: { q: string; mode: "web" | "direct"; res: any[] }) => {
    // Check and return newly structured object in the event that "No Results" exist
    if (!Array.isArray(input.res) || input.res.length === 0) {
      return {
        ...input,
        pageSummaries: [],
        fallback: "no-results" as const,
      };
    }
    // Else allocate the first 5 results
    const extractTopResults = input.res.slice(0, setTopResults);

    //Open each result's target 'url' digest and summarize content
    const settlesResults = await Promise.allSettled(
      extractTopResults.map(async (result: any) => {
        const { url, content } = await openUrl(result.url);
        const summarizeContent = await summarize(content);

        // Return settled promise (includes url && summary)
        return {
          url,
          summary: summarizeContent.summary,
        };
      }),
    );

    // Filter all 'rejected' Promise results, then return remaining results' values
    const settledResultsPageSummaries = settlesResults
      .filter((result) => result.status === "fulfilled")
      .map((settled) => settled.value);

    //Handle case where all settled results are 'rejected'
    if (settledResultsPageSummaries.length === 0) {
      // Construct 'fallback' summaries to be returned...
      const fallbackSnippetSummaries = extractTopResults
        .map((result: any) => ({
          url: result.url,
          summary: String(result.snippet || result.title || "").trim(),
        }))
        .filter((result) => result.summary.length > 0);

      return {
        ...input,
        pageSummaries: fallbackSnippetSummaries,
        fallback: "snippets" as const,
      };
    }

    return {
      ...input,
      pageSummaries: settledResultsPageSummaries,
      fallback: "none" as const,
    };
  },
);

// Step 3 Using previously returned Step 2 data...
export const stepCompose = RunnableLambda.from(
  async (input: {
    q: string;
    pageSummaries: {
      url: string;
      summary: string;
    }[];
    mode: "web" | "direct";
    fallback: "no-results" | "snippets" | "none";
  }): Promise<candidate> => {
    const model = getChatModel({ temperature: 0.2 });

    // Handle lack of page summaries
    if (!input.pageSummaries || input.pageSummaries.length === 0) {
      const directResFromModel = await model.invoke([
        new SystemMessage(
          [
            "You answer briefly and clearly for beginners",
            "If unsure, say so.",
          ].join("\n"),
        ),
        new HumanMessage(input.q),
      ]);

      const directRes =
        typeof directResFromModel.content === "string"
          ? directResFromModel.content
          : String(directResFromModel.content).trim();

      //Provide a 'direct' answer to the query/prompt
      return {
        answer: directRes,
        mode: "direct",
        sources: [],
      };
    }

    // Invole a model response using provided input page summaries
    const res = await model.invoke([
      new SystemMessage(
        [
          "You concisely answer questions using provided page summaries.",
          "Rules:",
          "- Be accurate and and nuetral",
          "- 5-8 sentences max",
          "- Use only the provided summaries; do not invent new facts.",
        ].join("\n"),
      ),
      new HumanMessage(
        [
          `Question: ${input.q}`,
          "Summaries:",
          JSON.stringify(input.pageSummaries, null, 2),
        ].join("\n"),
      ),
    ]);

    const finalRes =
      typeof res.content === "string" ? res.content : String(res.content);

    const extractSources = input.pageSummaries.map((x) => x.url);

    return {
      answer: finalRes,
      sources: extractSources,
      mode: "web",
    };
  },
);

// Step 4 LCEL (bring it all together)
export const webPath = RunnableSequence.from([
  webSearchStep,
  openAndSummarizeStep,
  stepCompose,
]);
