import type { Lead } from "./leads";

export type ScoreRow = { label: string; points: number };
export type Score = {
  rows: ScoreRow[];
  total: number;
  verdict: string;
  // true when the site exists but couldn't be fetched — rows cover only URL-level facts
  partial: boolean;
};

// heuristic signals from the raw HTML: a pre-viewport site is both outdated and
// mobile-hostile, and >150KB of markup is a bloat proxy for slow mobile loads
const VIEWPORT = /<meta[^>]+viewport/i;
const LEGACY = /<(font|center|marquee|blink|frameset)\b/i;
const BOOKING = /\b(book(ing|ed)?|reserv(e|ation|ed)?|appointments?|schedule)\b/i;

export function scoreLead(lead: Lead, html: string | null): Score {
  const rows: ScoreRow[] = [];

  if (!lead.website) {
    // no site at all: online booking/enquiry gaps are certain, so they all count
    rows.push(
      { label: "No website", points: 30 },
      { label: "No booking system", points: 20 },
      { label: "No enquiry form", points: 15 },
    );
  } else if (html !== null) {
    const friendly = VIEWPORT.test(html);
    if (!friendly || LEGACY.test(html)) rows.push({ label: "Outdated website", points: 20 });
    if (!friendly || html.length > 150_000) rows.push({ label: "Poor mobile performance", points: 15 });
    if (!BOOKING.test(html)) rows.push({ label: "No booking system", points: 20 });
    if (!/<form\b/i.test(html)) rows.push({ label: "No enquiry form", points: 15 });
  }

  // plain-HTTP host: a URL-level fact, known even when the fetch failed
  if (lead.website.startsWith("http://")) rows.push({ label: "No SSL", points: 10 });
  rows.push({ label: "Relevant industry", points: 20 });

  const total = rows.reduce((n, r) => n + r.points, 0);
  return {
    rows,
    total,
    verdict: total >= 70 ? "High opportunity" : total >= 40 ? "Medium opportunity" : "Low opportunity",
    partial: Boolean(lead.website) && html === null,
  };
}
