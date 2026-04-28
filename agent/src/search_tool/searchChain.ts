import { RunnableBranch, RunnableSequence } from "@langchain/core/runnables";
import { webPath } from "./webPipeline";
import { directPath } from "./directPipe";
import { routerStep } from "./routeStrategy";
import { finalValidation } from "./finalValidation";
import { SearchInput } from "../utils/schemas";

// Assemble branching.., we have two
const branch = RunnableBranch.from<{ q: string; mode: "web" | "direct" }, any>([
  // If the inputted mode is 'web'...
  [(input) => input.mode === "web", webPath],
  directPath,
]);

// Link 'search' steps together including final validation
export const searchChain = RunnableSequence.from([
  routerStep,
  branch,
  finalValidation,
]);

// Export main agent functionality
export async function runSearch(input: SearchInput) {
  return await searchChain.invoke(input);
}
