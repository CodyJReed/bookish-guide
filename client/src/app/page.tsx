"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_URL } from "@/lib/config";
import { error } from "console";
import Link from "next/link";
import { useState, useRef, useEffect, FormEvent } from "react";

type SearchResponse = {
  answer: string;
  sources: string[];
};

type CurrentChatTurn =
  | {
      role: "user";
      content: string;
    }
  | {
      role: "assistant";
      content: string;
      sources: string[];
      time: number;
      error?: string;
    };

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [chat, setChat] = useState<CurrentChatTurn[]>([]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chat]);

  const runSearch = async (prompt: string) => {
    setLoading(true);
    setChat((old) => [...old, { role: "user", content: prompt }]);
    const oldTime = performance.now();
    try {
      const res = await fetch(`${API_URL}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: prompt,
        }),
      });

      const json = await res.json();
      const timeDiff = Math.round(performance.now() - oldTime);

      if (!res.ok) {
        setChat((old) => [
          ...old,
          {
            role: "assistant",
            content: "I tried to answer, but something went wrong.",
            sources: [],
            time: timeDiff,
            error: "Request failed",
          },
        ]);

        return;
      }

      const data = json as SearchResponse;
      setChat((old) => [
        ...old,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources,
          time: timeDiff,
        },
      ]);

      return;
    } catch (e) {
      const timeDiff = Math.round(performance.now() - oldTime);
      setChat((old) => [
        ...old,
        {
          role: "assistant",
          content: "I tried to answer, but something went wrong.",
          sources: [],
          time: timeDiff,
          error: "Request failed",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const prompt = query.trim();
    if (!prompt || loading) return;
    setQuery("");
    await runSearch(prompt);
  };

  return (
    <div className="flex h-dvh flex-col bg-[#f9fafb] text-gray-900">
      <header className="border-b bg-white px-4 py-3 text-sm flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-medium text-gray-800">
            Seacrh V1 (LCEL Web Agent)
          </span>
          <span className="text=[11px] text-gray-500">
            Answer with sources. Some queries will browse the web, and some
            won't.
          </span>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {chat.length === 0 && (
          <div className="mx-auto max-w-2xl w-full text-center text-sm text-gray-500">
            <div className="text-base font-semibold text-gray-800 mb-1">
              Ask anything
            </div>
            <div className="text-[14px] leading-relaxed">
              Examples:
              <br />
              <code className="rounded bg-gray-100 px-1 py-2 text-[12px[">
                Top 5 sushi restraunts in Reno NV 2025
              </code>
              <code className="rounded bg-gray-100 px-1 py-2 text-[12px[">
                Explain what Docker is for beginners
              </code>
            </div>
          </div>
        )}
        {chat.map((turn, idx) => {
          // User role
          if (turn.role === "user") {
            return (
              <div
                key={idx}
                className="mx-auto max-w-2xl flex justify-end items-center text-right"
              >
                <div className="inline-block rounded-2xl bg-gray-900 px-4 py-3 text-sm text-white shadow-md">
                  <div className="whitespace-pre-wrap wrap-break-word">
                    {turn.content}
                  </div>
                </div>
              </div>
            );
          }
          // Assistant role
          return (
            <div
              key={idx}
              className="mx-auto max-w-2xl flex items-start gap-3 text-left"
            >
              <div className="flex h-8 w-8 bg-gray-900 flex-none items-center justify-center rounded-md text-[11px] text-white font-semibold">
                AI
              </div>
              <div className="flex-1 space-y-3">
                <div className="inline-block rounded-2xl px-4 py-3 text-sm  shadow-sm ring-1 ring-gray-200 w-full whitespace-pre-wrap wrap-break-word">
                  {turn.content}
                </div>
                <div>
                  {typeof turn.time === "number" && (
                    <span className="text-[11px] text-gray-500 flex-wrap items-center gap-x-2">
                      answered in {turn.time} time
                    </span>
                  )}
                  {turn?.error && <span>{turn.error}</span>}
                </div>
                {turn.sources && turn.sources.length > 0 && (
                  <div className="rounded-lg bg-white px-3 py-2 text-[12px] shadow-sm ring-1 ring-gray-200">
                    <div className="text-[11px] font-medium text-gray-600 mb-1 ">
                      Sources
                    </div>
                    <ul className="space-y-1">
                      {turn.sources.map((s, i) => (
                        <li key={i} className="truncate">
                          <Link
                            href={s}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 underline-offset-4 break-all"
                          >
                            {s}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="mx-auto max-w-2xl flex items-start gap-3 text-left">
            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-gray-700 text-[11px] font-semibold text-white">
              ...
            </div>
            <p className="inline-block rounded-2xl bg-gray-900 px-4 py-3 text-sm text-white shadow-md w-full">
              Thinking
            </p>
          </div>
        )}
        <footer className="border-t bg-white p-4">
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex w-full max-w-2xl items-end gap-2"
          >
            <Input
              className="w-full resize-none"
              placeholder="Ask your question..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
            />
            <Button
              disabled={loading || query.trim().length < 5}
              type="submit"
              className="shrink-0"
            >
              {loading ? "..." : "Send"}
            </Button>
          </form>
        </footer>
      </main>
    </div>
  );
}
