"use client";

import { useState } from "react";
import type { Lead } from "@/lib/leads";

const SECTIONS = [
  ["EMAIL", "Professional email"],
  ["LINKEDIN", "LinkedIn connection message"],
  ["INTRO", "Short business introduction"],
] as const;

// "### EMAIL\n…" chunks arrive mid-typing; a key line without its newline yet is skipped
function sections(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of text.split(/^###\s*/m).slice(1)) {
    const nl = part.indexOf("\n");
    if (nl > 0) out[part.slice(0, nl).trim().toUpperCase()] = part.slice(nl + 1);
  }
  return out;
}

export default function MessageGenerator({ lead, problems }: { lead: Lead; problems: string[] }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function run() {
    setBusy(true);
    setErr("");
    setText("");
    try {
      const r = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // flat body like the outreach route: lead fields at the top level
        body: JSON.stringify({ ...lead, problems }),
      });
      if (!r.ok || !r.body) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Server responded ${r.status}, retry.`);
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const j = JSON.parse(data) as { choices?: { delta?: { content?: unknown } }[] };
            const delta = j.choices?.[0]?.delta?.content;
            if (typeof delta === "string") setText((t) => t + delta);
          } catch {
            // partial JSON at a chunk boundary — the rest arrives in the next read
          }
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  }

  const secs = sections(text);

  return (
    <div className="mt-6 rounded border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            AI Personalized Message Generator
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {problems.length > 0
              ? `Grounded in ${problems.length} verified observation${problems.length === 1 ? "" : "s"} — no invented problems.`
              : "No problems recorded — the messages will be a warm, general introduction."}
          </p>
        </div>
        <button
          onClick={run}
          disabled={busy}
          className="shrink-0 rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {busy ? "Generating…" : text ? "Regenerate" : "Generate messages"}
        </button>
      </div>

      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

      {(busy || text) && (
        <div className="mt-4 space-y-4">
          {SECTIONS.map(([key, label]) => (
            <div key={key}>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
              {secs[key] ? (
                <p className="mt-1 whitespace-pre-wrap text-sm">{secs[key].trim()}</p>
              ) : busy ? (
                <p className="mt-1 text-sm text-zinc-400">…writing</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
