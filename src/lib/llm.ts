import type { Lead, Outreach } from "./leads";

// ponytail: OpenRouter's API and a local llama.cpp server both speak the OpenAI
// chat-completions protocol — one code path, switch between them with LLM_BASE_URL /
// LLM_MODEL. Add a provider-specific branch (tools, reasoning formats) only when one
// of them stops accepting this shape.
const BASE = (process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/+$/, "");
const MODEL = process.env.LLM_MODEL || "openrouter/auto";
const KEY = process.env.OPENROUTER_API_KEY || "";
// ponytail: `chat_template_kwargs` is a llama-server extension — send it only to local
// servers so cloud providers (OpenRouter rejects unknown fields) keep working untouched;
// switch this to an explicit LLM_DISABLE_THINKING env var if a remote llama.cpp shows up
const LOCAL = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?(\/|$)/.test(BASE);

const SYSTEM = `You write cold outreach for a small agency that builds websites for local businesses.
The lead below runs a business that currently has no website.
Reply with ONLY a JSON object, no markdown fences, no commentary:
{"whatsapp_message": "...", "email_subject": "...", "email_body": "..."}
Rules:
- whatsapp_message: under 400 characters, conversational, specific to this business, ends with a question, no emojis, no signature.
- email_subject: under 60 characters, specific, no clickbait.
- email_body: 90-140 words, plain text, one clear call to action, no placeholders, no signature (the sender adds theirs).
- Never invent details that are not in the lead, and never copy the lead's own contact details into your draft.
- If you reference a date, day or year, use only today's date given in the user message — never a past year like 2024.`;

// reply keys must not collide with the lead's keys (email/whatsapp), otherwise small
// models just echo the lead back; instructions repeat after the data so template-less
// completion servers (llama-server on GGUFs without a chat template) still see them last
const ASK = `Reply now with ONLY the JSON object: {"whatsapp_message": "...", "email_subject": "...", "email_body": "..."}`;

const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function parseOutreach(text: string): Outreach {
  const json = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    // models routinely leave a dangling comma before the closing brace
    .replace(/,\s*([}\]])/g, "$1");
  const start = json.indexOf("{");
  const end = json.lastIndexOf("}");
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(start >= 0 && end > start ? json.slice(start, end + 1) : json);
  } catch {
    throw new Error("LLM returned an unparseable draft, retry.");
  }
  const out = {
    whatsapp: clean(o.whatsapp_message),
    subject: clean(o.email_subject),
    email: clean(o.email_body),
  };
  if (!out.whatsapp || !out.subject || !out.email)
    throw new Error("LLM returned an incomplete draft, retry.");
  return out;
}

export async function generateOutreach(lead: Lead): Promise<Outreach> {
  // only what the copy needs — dropping lat/lon/whatsapp digits keeps small models
  // from treating the payload as something to re-emit
  const data = { name: lead.name, address: lead.address, phone: lead.phone, website: lead.website, email: lead.email };
  let res: Response;
  try {
    res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(KEY ? { Authorization: `Bearer ${KEY}` } : {}),
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.7,
        // hard cap: without it llama-server generates until the context fills (the 60s abort)
        max_tokens: 8000,
        // reasoning/thinking tokens share max_tokens — without this they eat the whole
        // draft budget and you get finish_reason "length" with empty content
        ...(LOCAL
          ? { chat_template_kwargs: { enable_thinking: false } }
          : { reasoning: { effort: "none" } }),
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            // fresh on every request so cached/stale prompts can't leak an old year
            content: `Today's date: ${new Date().toString()}\nBusiness data:\n${JSON.stringify(data)}\n${ASK}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    throw new Error(
      `LLM unreachable at ${BASE} — ${err instanceof Error ? err.message : "network error"}.`,
    );
  }
  if (!res.ok) throw new Error(`LLM responded ${res.status}, retry.`);
  // llama-server sometimes answers 200 with an empty or cut-off body (queued behind an
  // aborted request, or the client dropped the socket) — read it once, name the failure
  let raw: string;
  try {
    raw = await res.text();
  } catch (err) {
    throw new Error(
      `LLM dropped the connection — ${err instanceof Error ? err.message : "read error"}. Retry.`,
    );
  }
  if (!raw.trim()) throw new Error("LLM returned an empty response, retry.");
  let j: { choices?: { finish_reason?: string; message?: { content?: unknown } }[] };
  try {
    j = JSON.parse(raw);
  } catch {
    throw new Error("LLM returned a malformed response, retry.");
  }
  const choice = j.choices?.[0];
  const content = choice?.message?.content;
  if (typeof content !== "string" || !content.trim())
    throw new Error(
      choice?.finish_reason === "length"
        ? "LLM spent the whole token cap before writing the draft — thinking is on; disable it or raise max_tokens."
        : "LLM returned no content, retry.",
    );
  return parseOutreach(content);
}
