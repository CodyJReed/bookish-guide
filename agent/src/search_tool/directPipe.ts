import { RunnableLambda } from "@langchain/core/runnables";
import { candidate } from "./types";
import { getChatModel } from "../shared/models";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

export const directPatch = RunnableLambda.from(
  async (input: { q: string; mode: "web" | "direct" }): Promise<candidate> => {
    const model = getChatModel({ temperature: 0.2 });

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
  },
);
