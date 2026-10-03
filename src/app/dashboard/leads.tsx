"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import type { Lead, Outreach, SavedSearch } from "@/lib/leads";
import Image from "next/image";
import { Delete, DeleteIcon, Trash } from "lucide-react";

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

function toCsv(leads: Lead[]) {
  const head = ["name", "address", "phone", "whatsapp", "website", "email", "lat", "lon"];
  const rows = leads.map((l) =>
    [l.name, l.address, l.phone, l.whatsapp, l.website, l.email, String(l.lat), String(l.lon)]
      .map(csvCell)
      .join(","),
  );
  return [head.join(","), ...rows].join("\n");
}

const mapsUrl = (l: Lead) =>
  `https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lon}`;

export default function Dashboard({
  name,
  email,
  searches,
}: {
  name: string;
  email: string;
  searches: SavedSearch[];
}) {
  const router = useRouter();
  const [niche, setNiche] = useState("");
  const [location, setLocation] = useState("");
  const [limit, setLimit] = useState(60);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [area, setArea] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [noSite, setNoSite] = useState(true);
  const [og, setOg] = useState<{ lead: Lead; busy: boolean; err: string; d: Outreach | null } | null>(null);
  const [copied, setCopied] = useState("");

  const shown = noSite ? leads.filter((l) => !l.website) : leads;

  async function run(saved?: SavedSearch) {
    if (saved) {
      setNiche(saved.niche);
      setLocation(saved.location);
      setLimit(saved.limit);
    }
    // saved searches replay stored results from the DB; nothing to re-geocode
    const url = saved
      ? `/api/search?id=${saved.id}`
      : `/api/search?niche=${encodeURIComponent(niche)}&location=${encodeURIComponent(location)}&limit=${limit}`;

    setLoading(true);
    setError("");
    try {
      const r = await fetch(url);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Search failed");
      setLeads(j.leads);
      setArea(j.location);
      // server re-renders, so the sidebar picks up the just-saved search
      router.refresh();
    } catch (err) {
      setLeads([]);
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function del(id: string, niche: string) {
    if (!confirm(`Delete the saved search "${niche}"?`)) return;
    const r = await fetch(`/api/search?id=${id}`, { method: "DELETE" });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setError(j.error ?? "Could not delete the saved search.");
      return;
    }
    router.refresh(); // sidebar picks up the removed row
  }

  function download() {
    const blob = new Blob([toCsv(shown)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "leads.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function outreachFor(l: Lead) {
    setCopied("");
    setOg({ lead: l, busy: true, err: "", d: null });
    try {
      const r = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(l),
      });
      const j = (await r.json().catch(() => ({}))) as Outreach & { error?: string };
      if (!r.ok) throw new Error(j.error ?? `Server responded ${r.status}, retry.`);
      if (!j.whatsapp || !j.email) throw new Error("Empty response from server, retry.");
      setOg({ lead: l, busy: false, err: "", d: j });
    } catch (err) {
      setOg({
        lead: l,
        busy: false,
        err: err instanceof Error ? err.message : "Generation failed.",
        d: null,
      });
    }
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 1500);
  }

  async function signOut() {
    await authClient.signOut({
      fetchOptions: { onSuccess: () => router.push("/login") },
    });
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100">
      <aside className="sticky top-0 flex h-dvh w-56 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="px-4 py-4">
          <Image src={'/logo.svg'} alt="Blindspot" width={180} height={180} />
          {/*<p className="text-sm font-semibold tracking-tight">Blindspot</p>
          <p className="text-xs text-zinc-400">Lead Finder</p>*/}
        </div>

        <p className="px-4 pb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
          Saved searches
        </p>
        <nav className="flex-1 overflow-y-auto px-2">
          {searches.length === 0 ? (
            <p className="px-2 py-1 text-xs text-zinc-400">
              Nothing yet — run a search and it lands here.
            </p>
          ) : (
            searches.map((s) => {
              const active = s.niche === niche && s.location === location;
              return (
                <div
                  key={s.id}
                  className={`flex items-center rounded ${
                    active ? "bg-zinc-100 font-medium dark:bg-zinc-900" : ""
                  }`}
                >
                  <button
                    onClick={() => run(s)}
                    className="min-w-0 flex-1 px-2 py-1.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  >
                    <span className="block truncate">{s.niche}</span>
                    <span className="block truncate text-xs text-zinc-500">
                      {s.location}
                    </span>
                  </button>
                  <button
                    onClick={() => del(s.id, s.niche)}
                    aria-label={`Delete saved search ${s.niche}`}
                    title="Delete"
                    className="mr-1 self-stretch rounded px-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800"
                  >
                    <Trash className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              );
            })
          )}
        </nav>

        <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <p className="truncate text-xs font-medium">{name}</p>
          <p className="truncate text-xs text-zinc-500">{email}</p>
          <button
            onClick={signOut}
            className="mt-2 w-full rounded border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Lead Finder</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Businesses by niche + location.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
          className="mt-6 flex flex-row items-center justify-between gap-3"
        >
          <div className="flex flex-row items-end justify-start gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Niche
              <input
                list="niches"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="restaurant, dentist, amenity=…"
                className="w-56 rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <datalist id="niches">
                {["restaurant", "cafe", "driving school", "dentist", "clinic", "pharmacy", "gym", "salon", "bakery", "hotel", "school", "mechanic", "grocery", "bar"].map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Location
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Lahore, Pakistan"
                required
                className="w-64 rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Max
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="appearance-none rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                {[20, 60, 150, 300].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </div>

          {leads.length > 0 && (
            <button
              onClick={() => {
                setLeads([]);
                setArea("");
                setError("");
                setNiche("");
                setLocation("");
              }}
              className="mt-4 rounded border border-zinc-300 px-5 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              Clear results
            </button>
          )}
        </form>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}



        {!error && !loading && area && leads.length === 0 && (
          <p className="mt-4 text-sm text-zinc-500">
            No businesses found for &ldquo;{niche}&rdquo; near {area}. OpenStreetMap coverage is patchy —
            try a broader niche (e.g. restaurant) or a larger nearby town.
          </p>
        )}

        {leads.length > 0 && (
          <>
            <div className="mt-6 flex items-center justify-between gap-4">
              <p className="text-sm text-zinc-500">
                {noSite ? `${shown.length} of ${leads.length} without a website` : `${leads.length} leads`} · {area}
              </p>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={noSite}
                    onChange={(e) => setNoSite(e.target.checked)}
                    className="h-4 w-4 accent-amber-600"
                  />
                  Only without a website
                </label>
                <button
                  onClick={download}
                  className="rounded border border-zinc-300 px-4 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  Export CSV
                </button>
              </div>
            </div>
            {shown.length === 0 && (
              <p className="mt-3 text-sm text-amber-700">
                All {leads.length} leads have a website — untick the filter to see them.
              </p>
            )}
            <div className="mt-3 overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-100 text-xs uppercase text-zinc-500 dark:bg-zinc-900">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Address</th>
                    <th className="px-3 py-2">Contact</th>
                    <th className="px-3 py-2">Online</th>
                    <th className="px-3 py-2">Lookup</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((l, i) => (
                    <tr key={`${l.lat}-${l.lon}-${i}`} className="border-t border-zinc-200 dark:border-zinc-800">
                      <td className="px-3 py-2">
                        <button
                          onClick={() => outreachFor(l)}
                          title="Draft a WhatsApp message and email for this business"
                          className="font-medium hover:text-blue-600 hover:underline"
                        >
                          {l.name}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-zinc-500">{l.address || "—"}</td>
                      <td className="px-3 py-2">
                        {l.phone ? (
                          <a href={`tel:${l.phone}`} className="text-blue-600 hover:underline dark:text-blue-400">{l.phone}</a>
                        ) : "—"}
                        {l.whatsapp && (
                          <>
                            {" · "}
                            <a href={`https://wa.me/${l.whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline dark:text-green-400">WhatsApp</a>
                          </>
                        )}
                        {l.email && (
                          <>
                            {" · "}
                            <a href={`mailto:${l.email}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">email</a>
                          </>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {l.website ? (
                          <a href={l.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">{l.website.replace(/^https?:\/\//, "")}</a>
                        ) : (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">No website</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <a href={mapsUrl(l)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">Google Maps</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {og && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
          onClick={() => setOg(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded border border-zinc-200 bg-white p-5 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold">{og.lead.name}</h2>
                <p className="truncate text-xs text-zinc-500">{og.lead.address || "No address on record"}</p>
              </div>
              <button
                onClick={() => setOg(null)}
                className="shrink-0 rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Close
              </button>
            </div>

            {og.busy && <p className="mt-4 text-sm text-zinc-500">Writing outreach…</p>}
            {og.err && <p className="mt-4 text-sm text-red-600">{og.err}</p>}

            {og.d && (
              <div className="mt-4 space-y-4">
                {([["WhatsApp", og.d.whatsapp], ["Subject", og.d.subject], ["Email", og.d.email]] as const).map(
                  ([label, value]) => (
                    <div key={label}>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
                        <button
                          onClick={() => copy(value, label)}
                          className="rounded border border-zinc-300 px-2 py-0.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                        >
                          {copied === label ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap rounded border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                        {value}
                      </p>
                    </div>
                  ),
                )}
                {!og.lead.whatsapp && !og.lead.email && (
                  <p className="text-xs text-amber-700">
                    No WhatsApp number or email on record for this business — the draft is
                    still a usable starting point.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
