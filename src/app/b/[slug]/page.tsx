import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { request } from "@/lib/http";
import { slugify } from "@/lib/leads";
import { scoreLead } from "@/lib/score";
import type { Lead } from "@/lib/leads";

const UA = { "User-Agent": "blindspot-leadfinder/0.1 (local prototype)" };

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const { slug } = await params;

  // ponytail: leads live as a jsonb blob — scan the user's saved searches by slug in JS;
  // move to a Lead table with a slug index when the scan gets slow
  const searches = await prisma.search.findMany({
    where: { userId: session.user.id },
    select: { results: true },
  });
  let lead: Lead | null = null;
  for (const s of searches) {
    lead = ((s.results as Lead[] | null) ?? []).find((l) => slugify(l.name) === slug) ?? null;
    if (lead) break;
  }
  if (!lead) notFound();

  let html: string | null = null;
  if (lead.website) {
    const url = lead.website.includes("://") ? lead.website : `https://${lead.website}`;
    try {
      html = (await request(url, { headers: UA, timeoutMs: 10000, text: true })) as string;
    } catch {
      // unreachable/non-200 site → partial score, flagged in the UI
    }
  }
  const score = scoreLead(lead, html);

  const verdictColor =
    score.total >= 70 ? "text-emerald-600 dark:text-emerald-400" : score.total >= 40 ? "text-amber-600 dark:text-amber-400" : "text-zinc-500";

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lead.lat},${lead.lon}`;

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:underline">
          ← Back to dashboard
        </Link>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{lead.name}</h1>
        <p className="mt-1 text-sm text-zinc-500">{lead.address || "No address on record"}</p>

        <div className="mt-6 rounded border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <p className={`text-3xl font-semibold tracking-tight ${verdictColor}`}>
            {score.total}/100
            <span className="ml-2 text-base font-normal text-zinc-600 dark:text-zinc-400">
              – {score.verdict}.
            </span>
          </p>
          {score.partial && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
              The website could not be loaded — this score covers only what could be
              verified, and is likely higher.
            </p>
          )}
          <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-900">
            {score.rows.map((r) => (
              <li key={r.label} className="flex items-center justify-between py-1.5 text-sm">
                <span>{r.label}</span>
                <span className="font-medium">+{r.points}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 rounded border border-zinc-200 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Contact</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline dark:text-blue-400">{lead.phone}</a>
            )}
            {lead.whatsapp && (
              <a href={`https://wa.me/${lead.whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline dark:text-green-400">WhatsApp</a>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline dark:text-blue-400">{lead.email}</a>
            )}
            {lead.website && (
              <a href={lead.website.includes("://") ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
                {lead.website.replace(/^https?:\/\//, "")}
              </a>
            )}
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">Google Maps</a>
          </div>
          {!lead.phone && !lead.whatsapp && !lead.email && !lead.website && (
            <p className="mt-2 text-zinc-500">No contact details on record — use Google Maps.</p>
          )}
        </div>
      </div>
    </main>
  );
}
