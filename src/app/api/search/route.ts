import { NextRequest, NextResponse } from "next/server";
import { buildOverpass, parseOverpass, resolveNiche, type Lead } from "@/lib/leads";
import { request } from "@/lib/http";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const UA = { "User-Agent": "blindspot-leadfinder/0.1 (local prototype)" };
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
// public Overpass instances race each other; a single one is flaky (502/504 measured often)
const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const CACHE_MS = 24 * 60 * 60 * 1000;

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
    if (s.results) return NextResponse.json({ id: s.id, location: s.area, leads: s.results as Lead[] });
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

  // repeat search → stored results, no Nominatim/Overpass wait. limit is part of the
  // key because a bigger Max would otherwise be answered with the old, smaller result set.
  const hit = await prisma.search.findUnique({
    where: { userId_niche_location: { userId: session.user.id, niche, location } },
  });
  if (
    hit?.results &&
    hit.limit === limit &&
    Date.now() - hit.updatedAt.getTime() < CACHE_MS
  ) {
    console.log(
      `CACHE HIT id=${hit.id} now=${Date.now()} updated=${hit.updatedAt.getTime()} ageMs=${Date.now() - hit.updatedAt.getTime()} cacheMs=${CACHE_MS} limitHit=${hit.limit} limitReq=${limit}`,
    );
    return NextResponse.json({ id: hit.id, location: hit.area ?? location, leads: hit.results as Lead[] });
  }
  console.log(`CACHE MISS hasHit=${!!hit} hasResults=${!!hit?.results} hitLimit=${hit?.limit} reqLimit=${limit} ageMs=${hit ? Date.now() - hit.updatedAt.getTime() : -1}`);

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
  // ponytail: race the mirrors instead of retrying one — measured 34-48 s and frequent 502 on a saturated public instance, losers keep running and are dropped
  let ov: { elements?: unknown[] } | undefined;
  try {
    ov = (await Promise.any(
      MIRRORS.map((url) =>
        request(url, {
          method: "POST",
          headers: { ...UA, "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ data: buildOverpass(filters, bbox, limit) }).toString(),
          timeoutMs: 45000,
        }),
      ),
    )) as { elements?: unknown[] };
  } catch {
    console.error("overpass failed: every mirror rejected or timed out");
    return NextResponse.json(
      { error: "Overpass failed (busy servers or timeout), retry in a moment." },
      { status: 502 },
    );
  }

  const leads = parseOverpass(ov!).slice(0, limit);
  const area = geo[0].display_name;

  const row = await prisma.search.upsert({
    where: { userId_niche_location: { userId: session.user.id, niche, location } },
    update: { limit, results: leads, area },
    create: { userId: session.user.id, niche, location, limit, results: leads, area },
  });

  return NextResponse.json({ id: row.id, location: area, leads });
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
