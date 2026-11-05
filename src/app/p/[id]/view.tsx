"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Gauge, ClipboardCheck, Sparkles, Contact, ArrowLeft } from "lucide-react";
import type { Lead } from "@/lib/leads";
import type { Check, Score } from "@/lib/score";
import MessageGenerator from "./messages";
import { useRouter } from "next/navigation";

const TABS = [
  { label: "Overview", icon: Gauge },
  { label: "Website inspection", icon: ClipboardCheck },
  { label: "AI messages", icon: Sparkles },
  { label: "Contact", icon: Contact },
] as const;
type Tab = (typeof TABS)[number]["label"];

export default function BusinessView({
  lead,
  score,
  checks,
  problems,
}: {
  lead: Lead;
  score: Score;
  checks: Check[];
  problems: string[];
  }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Overview");
  const url = lead.website ? (lead.website.includes("://") ? lead.website : `https://${lead.website}`) : "";
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lead.lat},${lead.lon}`;
  const verdictColor =
    score.total >= 70 ? "text-emerald-600 dark:text-emerald-400" : score.total >= 40 ? "text-amber-600 dark:text-amber-400" : "text-zinc-500";
  const verdictFill =
    score.total >= 70 ? "bg-emerald-500" : score.total >= 40 ? "bg-amber-500" : "bg-zinc-400";

  // sections stay mounted (hidden, not unmounted) so streamed messages survive tab switches
  const show = (t: Tab) => (tab === t ? "" : "hidden");

  return (
    <div className="flex min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100">
      <aside className="sticky top-0 flex h-dvh w-56 shrink-0 flex-col border-r border-zinc-200 bg-linear-to-b from-coral/15 to-white dark:border-zinc-800 dark:from-coral/10 dark:to-zinc-950">
        <div className="px-4 py-4">
          <Link href="/" aria-label="Blindspot home">
            <Image src="/logo.svg" alt="Blindspot" width={180} height={180} />
          </Link>
        </div>

        <p className="mx-auto mb-1 flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-white/70 px-3 py-1 text-xs text-zinc-600 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-400">
          <span className="h-1.5 w-1.5 rounded-full bg-coral" />
          Lead report
        </p>

        <nav className="flex-1 px-2 pt-2">
          {TABS.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => setTab(label)}
              aria-current={tab === label ? "page" : undefined}
              className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm ${
                tab === label ? "bg-zinc-100 font-medium dark:bg-zinc-900" : "hover:bg-zinc-100 dark:hover:bg-zinc-900"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {label}
            </button>
          ))}
        </nav>

      </aside>

      <main className="min-w-0 flex-1 px-6 py-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="cursor-pointer flex w-fit items-center gap-1 rounded-full border border-zinc-200 bg-white/70 px-3 py-1 text-xs text-zinc-600 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-400"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
        {/*<p className="flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-white/70 px-3 py-1 text-xs text-zinc-600 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-400">
          <span className="h-1.5 w-1.5 rounded-full bg-coral" />
          {score.total}/100 · {score.verdict}
        </p>*/}
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{lead.name}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {lead.address || "No address on record"}
          {" · "}
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
            Google Maps
          </a>
          {lead.website && (
            <>
              {" · "}
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
                {lead.website.replace(/^https?:\/\//, "")}
              </a>
            </>
          )}
        </p>

        <div className={show("Overview")}>
          <div className="mt-6 rounded border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Opportunity score
            </p>
            <p className={`mt-2 text-4xl font-semibold tracking-tight ${verdictColor}`}>
              {score.total}
              <span className="text-2xl">/100</span>
              <span className="ml-2 text-base font-normal text-zinc-600 dark:text-zinc-400">
                – {score.verdict}.
              </span>
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
              <div
                className={`h-full rounded-full ${verdictFill}`}
                style={{ width: `${score.total}%` }}
              />
            </div>
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
        </div>

        <div className={show("Website inspection")}>
          <div className="mt-6 rounded border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Website inspection
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Automated audit of the public site — failed checks name the problem and the
              CodeHunts service that fixes it.
            </p>
            <ul className="mt-3 space-y-3">
              {checks.map((c) => (
                <li key={c.label} className="flex gap-3">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      c.status === "pass"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                        : c.status === "fail"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                    }`}
                  >
                    <span aria-hidden>{c.status === "pass" ? "✓" : c.status === "fail" ? "✗" : "?"}</span>
                    <span className="sr-only">{c.status}</span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{c.label}</p>
                    {c.problem && <p className="mt-0.5 text-sm text-zinc-500">{c.problem}</p>}
                    {c.service && (
                      <p className="mt-0.5 text-sm">
                        <span className="font-medium">Offer:</span>{" "}
                        <span className="text-zinc-600 dark:text-zinc-400">{c.service}</span>
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={show("AI messages")}>
          <MessageGenerator lead={lead} problems={problems} />
        </div>

        <div className={show("Contact")}>
          <div className="mt-6 rounded border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Contact</p>
            <div className="mt-3 flex flex-col items-start gap-2 text-sm">
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
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
                  {lead.website.replace(/^https?:\/\//, "")}
                </a>
              )}
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">Google Maps</a>
              {!lead.phone && !lead.whatsapp && !lead.email && !lead.website && (
                <p className="text-zinc-500">No contact details on record — use Google Maps.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
