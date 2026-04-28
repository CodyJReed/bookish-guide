import { RunnableLambda } from "@langchain/core/runnables";
import { candidate } from "./types";
import { SearchAnswerSchema } from "../utils/schemas";
import { getChatModel } from "../shared/models";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// Function to validate and structure returning model 'answer'
export const finalValidation = RunnableLambda.from(
  async (candidate: candidate) => {
    const draft = {
      answer: candidate.answer,
      sources: candidate.sources || [],
    };

    // Validate with schema
    const parsed = SearchAnswerSchema.safeParse(draft);

    // Return on success
    if (parsed.success) return parsed.data;

    // (Optional) Attempt to invoke and correct draft
    const repaired = await repairedAnswer(draft);
    // Validate...
    const drafted = SearchAnswerSchema.safeParse(repaired);
    // Return on success
    if (drafted.success) return drafted.data;
  },
);

async function repairedAnswer(
  obj: any,
): Promise<{ answer: string; sources: string[] }> {
  const model = getChatModel({ temperature: 0.2 });

  const res = await model.invoke([
    new SystemMessage(
      [
        "You fix json objects",
        "Respond only with valid json object",
        "Schema: {answer: string; sources: string[] (urls as strings) }",
      ].join("\n"),
    ),
    new HumanMessage(
      [
        "Make these exactly to the schema. Ensure sources is in array of url strings.",
        "Input JSON:",
        JSON.stringify(obj),
      ].join("\n"),
    ),
  ]);

  const text =
    typeof res.content === "string" ? res.content : String(res.content);

  const json = extractJson(text);

  return {
    answer: String(json?.answer ?? "").trim(),
    sources: Array.isArray(json?.sources) ? json?.sources?.map(String) : [],
  };
}

function extractJson(t: string) {
  const start = t.indexOf("{");
  const end = t.indexOf("}");

  if (start === -1 || end === -1) return {};

  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch (e) {
    return {};
  }
}
