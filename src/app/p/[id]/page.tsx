import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { request } from "@/lib/http";
import { leadId } from "@/lib/leads";
import { scoreLead, extractLinks, classifyLinkError, inspect, type LinkCheck } from "@/lib/score";
import type { Lead } from "@/lib/leads";
import BusinessView from "./view";

const UA = { "User-Agent": "blindspot-leadfinder/0.1 (local prototype)" };

// module-level so the render body stays pure (react-hooks/purity flags Date.now in components)
async function fetchSite(
  url: string,
): Promise<{ html: string | null; loadMs?: number; error?: string }> {
  const t0 = Date.now();
  try {
    const html = (await request(url, { headers: UA, timeoutMs: 10000, text: true })) as string;
    return { html, loadMs: Date.now() - t0 };
  } catch (err) {
    return { html: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const { id } = await params;

  // ponytail: leads live as a jsonb blob — scan the user's saved searches by slug in JS;
  // move to a Lead table with a slug index when the scan gets slow
  const searches = await prisma.search.findMany({
    where: { userId: session.user.id },
    select: { results: true },
  });
  let lead: Lead | null = null;
  for (const s of searches) {
    lead = ((s.results as Lead[] | null) ?? []).find((l) => leadId(l) === id) ?? null;
    if (lead) break;
  }
  if (!lead) notFound();

  const url = lead.website ? (lead.website.includes("://") ? lead.website : `https://${lead.website}`) : "";
  const site = lead.website ? await fetchSite(url) : { html: null as string | null };
  const { html, loadMs, error: fetchError } = site;
  // parallel HEAD checks, 4s each — HEAD keeps dead-link detection cheap;
  // false "broken" claims are avoided by classifyLinkError's lenient rules
  const links = html ? extractLinks(html, url) : [];
  const linkChecks: LinkCheck[] = await Promise.all(
    links.map(async (u) => {
      try {
        await request(u, { method: "HEAD", text: true, timeoutMs: 4000, headers: UA });
        return { url: u, status: "pass" as const };
      } catch (err) {
        return { url: u, status: classifyLinkError(err) };
      }
    }),
  );

  const score = scoreLead(lead, html);
  const checks = inspect(lead, html, { loadMs, fetchError, links: linkChecks });
  // only failed checks feed the prompt — the "never invent problems" guarantee
  const problems = checks.flatMap((c) => (c.status === "fail" && c.problem ? [c.problem] : []));

  return <BusinessView lead={lead} score={score} checks={checks} problems={problems} />;
}
