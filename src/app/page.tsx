"use client";

import { useState } from "react";
import type { Lead } from "@/lib/leads";

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

export default function Home() {
  const [niche, setNiche] = useState("driving school");
  const [location, setLocation] = useState("");
  const [limit, setLimit] = useState(60);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [area, setArea] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`/api/search?niche=${encodeURIComponent(niche)}&location=${encodeURIComponent(location)}&limit=${limit}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Search failed");
      setLeads(j.leads);
      setArea(j.location);
    } catch (err) {
      setLeads([]);
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  function download() {
    const blob = new Blob([toCsv(leads)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "leads.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100">
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Lead Finder</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Businesses by niche + location, with contact channels (OpenStreetMap).
        </p>

        <form onSubmit={search} className="mt-6 flex flex-wrap items-end gap-3">
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
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
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
        </form>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {leads.length > 0 && (
          <>
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-zinc-500">
                {leads.length} leads · {area}
              </p>
              <button
                onClick={download}
                className="rounded border border-zinc-300 px-4 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Export CSV
              </button>
            </div>
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
                  {leads.map((l, i) => (
                    <tr key={`${l.lat}-${l.lon}-${i}`} className="border-t border-zinc-200 dark:border-zinc-800">
                      <td className="px-3 py-2 font-medium">{l.name}</td>
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
                            <a href={`mailto:${l.email}`} className="text-blue-600 hover:underline dark:text-blue-400">email</a>
                          </>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {l.website ? (
                          <a href={l.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">{l.website.replace(/^https?:\/\//, "")}</a>
                        ) : "—"}
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
    </div>
  );
}
