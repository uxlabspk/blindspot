import { NextRequest, NextResponse } from "next/server";
import { buildOverpass, parseOverpass, resolveNiche } from "@/lib/leads";
import { request } from "@/lib/http";

const UA = { "User-Agent": "blindspot-leadfinder/0.1 (local prototype)" };
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const OVERPASS = "https://overpass-api.de/api/interpreter";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const niche = sp.get("niche") ?? "";
  const location = sp.get("location") ?? "";
  const limit = Math.min(Number(sp.get("limit")) || 60, 300);

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
  let ov: { elements?: unknown[] };
  try {
    ov = (await request(OVERPASS, {
      method: "POST",
      headers: { ...UA, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: buildOverpass(filters, bbox, limit) }).toString(),
      timeoutMs: 45000,
    })) as typeof ov;
  } catch {
    return NextResponse.json(
      { error: "Overpass failed (busy server or timeout), retry in a moment." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    location: geo[0].display_name,
    leads: parseOverpass(ov).slice(0, limit),
  });
}
