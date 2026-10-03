import { NextRequest, NextResponse } from "next/server";
import { buildOverpass, parseOverpass, resolveNiche, type Lead } from "@/lib/leads";
import { request } from "@/lib/http";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const UA = { "User-Agent": "blindspot-leadfinder/0.1 (local prototype)" };
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const OVERPASS = "https://overpass-api.de/api/interpreter";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session)
    return NextResponse.json({ error: "Sign in to search for leads." }, { status: 401 });

  const sp = req.nextUrl.searchParams;

  // saved search → replay stored results, no re-query to Nominatim/Overpass.
  // rows saved before `results` existed fall through to a live search and backfill.
  let saved: { id: string; niche: string; location: string; limit: number } | null = null;
  const id = sp.get("id");
  if (id) {
    const s = await prisma.search.findFirst({ where: { id, userId: session.user.id } });
    if (!s) return NextResponse.json({ error: "Saved search not found." }, { status: 404 });
    if (s.results) return NextResponse.json({ location: s.area, leads: s.results as Lead[] });
    saved = s;
  }

  const niche = saved?.niche ?? sp.get("niche") ?? "";
  const location = saved?.location ?? sp.get("location") ?? "";
  const limit = Math.min(saved?.limit ?? (Number(sp.get("limit")) || 60), 300);

  const filters = resolveNiche(niche);
  if (!filters)
    return NextResponse.json(
      { error: `Unknown niche "${niche}". Pick a suggestion or type key=value (e.g. amenity=restaurant).` },
      { status: 400 },
    );
  if (!location.trim())
    return NextResponse.json({ error: "Location required." }, { status: 400 });

  let geo: { display_name: string; boundingbox: string[] }[];
  try {
    geo = (await request(`${NOMINATIM}?format=jsonv2&limit=1&q=${encodeURIComponent(location)}`, {
      headers: UA,
      timeoutMs: 15000,
    })) as typeof geo;
  } catch (err) {
    console.error("nominatim failed:", err);
    return NextResponse.json({ error: "Geocoding failed (Nominatim unreachable), retry." }, { status: 502 });
  }
  if (!Array.isArray(geo) || !geo.length)
    return NextResponse.json({ error: `Location "${location}" not found.` }, { status: 400 });

  const [south, north, west, east] = geo[0].boundingbox;
  const bbox = `${south},${west},${north},${east}`;

  // ponytail: OSM contact-data coverage is sparse (~10% in Lahore) — swap this layer for Google Places API when a key exists; parseOverpass stays
  // ponytail: single-endpoint retry against Overpass's flaky LB (504 measured ~1 in 3) — add mirror fallback (overpass.kumi.systems) if retry rate stays high
  let ov: { elements?: unknown[] } | undefined;
  for (let attempt = 0; attempt < 3 && !ov; attempt++) {
    try {
      ov = (await request(OVERPASS, {
        method: "POST",
        headers: { ...UA, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: buildOverpass(filters, bbox, limit) }).toString(),
        timeoutMs: 45000,
      })) as { elements?: unknown[] };
    } catch (err) {
      if (attempt === 2) {
        console.error("overpass failed:", err);
        return NextResponse.json(
          { error: "Overpass failed (busy server or timeout), retry in a moment." },
          { status: 502 },
        );
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  const leads = parseOverpass(ov!).slice(0, limit);
  const area = geo[0].display_name;

  await prisma.search.upsert({
    where: { userId_niche_location: { userId: session.user.id, niche, location } },
    update: { limit, results: leads, area },
    create: { userId: session.user.id, niche, location, limit, results: leads, area },
  });

  return NextResponse.json({ location: area, leads });
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session)
    return NextResponse.json({ error: "Sign in to manage saved searches." }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  // userId in the where clause → deleting someone else's id is a no-op
  await prisma.search.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
