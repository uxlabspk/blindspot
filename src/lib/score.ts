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

// ——— inspection report: specific problems + the CodeHunts service that fixes each ———

export type CheckStatus = "pass" | "fail" | "unknown";
export type Check = {
  label: string;
  status: CheckStatus;
  problem: string | null;
  service: string | null;
};
export type LinkCheck = { url: string; status: CheckStatus };

// same-site links first (the ones the business controls), deduped, capped —
// shortcut: <a href> regex only; skip <area>/<onclick> targets, upgrade to a real
// HTML parser when link coverage becomes the bottleneck
export function extractLinks(html: string, base: string): string[] {
  let b: URL;
  try {
    b = new URL(base);
  } catch {
    return [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  const re = /<a\b[^>]*\bhref\s*=\s*["']([^"'#]+)["']/gi;
  for (let m; (m = re.exec(html)); ) {
    let u: string;
    try {
      u = new URL(m[1].trim(), b).toString();
    } catch {
      continue;
    }
    if (!/^https?:/.test(u) || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  out.sort((x, y) => Number(new URL(y).host === b.host) - Number(new URL(x).host === b.host));
  return out.slice(0, 10);
}

// broken = a definite 404/410 or the host is gone; timeouts, 403/405 (bot blocks)
// and 5xx stay "unknown" — a false "dead link" claim on a sales page is worse than a miss
export function classifyLinkError(err: unknown): CheckStatus {
  const msg = err instanceof Error ? err.message : String(err);
  return /^HTTP (404|410)$/.test(msg) || /ENOTFOUND|ECONNREFUSED|EHOSTUNREACH/.test(msg)
    ? "fail"
    : "unknown";
}

export function inspect(
  lead: Lead,
  html: string | null,
  meta: { loadMs?: number; fetchError?: string; links?: LinkCheck[] } = {},
): Check[] {
  if (!lead.website)
    return [
      {
        label: "Website",
        status: "fail",
        problem: "This business has no website at all.",
        service:
          "Complete website design & build — mobile-first, SSL, contact form and online booking included.",
      },
    ];

  const secure = lead.website.includes("://") ? lead.website.startsWith("https://") : true;
  // node's TLS layer fails the fetch itself on a bad cert, so the error names it
  const certBad = /CERT_|SELF_SIGNED|certificate/i.test(meta.fetchError ?? "");
  const sslCheck: Check =
    !secure || certBad
      ? {
          label: "SSL certificate",
          status: "fail",
          problem: certBad
            ? "The SSL certificate is invalid or expired."
            : "The site serves plain HTTP — no SSL certificate.",
          service: "SSL certificate installation and HTTPS enforcement.",
        }
      : html === null
        ? { label: "SSL certificate", status: "unknown", problem: "Could not verify — the site did not load.", service: null }
        : { label: "SSL certificate", status: "pass", problem: null, service: null };

  if (html === null) {
    const skip = (label: string): Check => ({
      label,
      status: "unknown",
      problem: "Could not inspect — the site did not load.",
      service: null,
    });
    return [
      skip("Mobile responsiveness"),
      skip("Website loading speed"),
      skip("Broken links"),
      sslCheck,
      skip("Contact form"),
      skip("Booking functionality"),
    ];
  }

  const load = meta.loadMs ?? 0;
  const links = meta.links ?? [];
  const broken = links.filter((l) => l.status === "fail");
  const verified = links.filter((l) => l.status !== "unknown");
  const slow = [load > 3000 ? `Took ${(load / 1000).toFixed(1)}s to load (target: under 3s)` : "",
    html.length > 150_000 ? `${Math.round(html.length / 1024)}KB of markup before a single image` : ""]
    .filter(Boolean)
    .join(" and ");

  return [
    VIEWPORT.test(html)
      ? { label: "Mobile responsiveness", status: "pass", problem: null, service: null }
      : {
          label: "Mobile responsiveness",
          status: "fail",
          problem: "No viewport meta tag — the layout does not adapt to phone screens.",
          service: "Responsive redesign — a mobile-first layout that works on every screen.",
        },
    slow
      ? {
          label: "Website loading speed",
          status: "fail",
          problem: `${slow}.`,
          service: "Performance tuning — caching, compression and asset cleanup for sub-3-second loads.",
        }
      : { label: "Website loading speed", status: "pass", problem: null, service: null },
    links.length === 0
      ? { label: "Broken links", status: "pass", problem: null, service: null }
      : broken.length > 0
        ? {
            label: "Broken links",
            status: "fail",
            problem: `${broken.length} of ${links.length} checked links are dead (404/410 or unreachable).`,
            service: "Link repair plus a maintenance plan so dead pages stop costing you customers.",
          }
        : verified.length === 0
          ? { label: "Broken links", status: "unknown", problem: "Link checks timed out or were blocked — nothing verified.", service: null }
          : { label: "Broken links", status: "pass", problem: null, service: null },
    sslCheck,
    /<form\b/i.test(html)
      ? { label: "Contact form", status: "pass", problem: null, service: null }
      : {
          label: "Contact form",
          status: "fail",
          problem: "No contact form anywhere on the page.",
          service: "Contact form with email notifications so enquiries land in your inbox.",
        },
    BOOKING.test(html)
      ? { label: "Booking functionality", status: "pass", problem: null, service: null }
      : {
          label: "Booking functionality",
          status: "fail",
          problem: "No online booking or appointment flow found.",
          service: "Online booking system — appointments and reservations straight from the site.",
        },
  ];
}
