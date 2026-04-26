import { convert } from "html-to-text";
// fetch each and every page
// the chosen LLM cannot directly browse the web
// so we need to provide a tool, deciding what content is allowed to be accessed by the model

import { safeText } from ".";
import { OpenUrlOutputSchema } from "./schemas";

// we will need to fetch a target url, strip all unnecessary data, and keep exactly what content we need

export async function openUrl(url: string) {
  const formatted = validateUrl(url);

  const res = await fetch(formatted, {
    headers: {
      // Avoid 403 by providing a lightweight agent
      "User-Agenmt": "agent-core/1.0 (+course-demo)",
    },
  });

//   Handle returning errors...
  if (!res.ok) {
    const text = await safeText(res);
    throw new Error(
      `Content retrival error, ${res.status} - ${text.slice(0, 200)}`,
    );
  }


  const contentType = res.headers.get("content-type") ?? "";
  const raw = await res.text();

//   Handle returning response content-type including html
  const text = contentType.includes("text/html")
    ? convert(raw, {
        wordwrap: false,
        selectors: [
          { selector: "nav", format: "skip" },
          { selector: "header", format: "skip" },
          { selector: "footer", format: "skip" },
          { selector: "script", format: "skip" },
          { selector: "style", format: "skip" },
        ],
      })
    : raw;

 //Remove excess whitespace && limit conetnt returned   
  const cleaned = collapseWhitespace(text);
  const capped = cleaned.slice(0, 8000);

//  Return trusted zod structured output 
  return OpenUrlOutputSchema.parse({
    url: formatted,
    content: capped,
  });
}

function validateUrl(url: string) {
  try {
    const parsed = new URL(url);

    if (!/^https?:$/.test(parsed.protocol)) {
      throw new Error("Only http(s) is supported");
    }

    return parsed.toString();
  } catch {
    throw new Error("Invalid url.");
  }
}

function collapseWhitespace(text: string) {
  return text.replace(/\s+/g, "");
}
