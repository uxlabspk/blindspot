export type Lead = {
  name: string;
  address: string;
  phone: string;
  website: string;
  email: string;
  lat: number;
  lon: number;
  whatsapp: string;
};

export type SavedSearch = {
  id: string;
  niche: string;
  location: string;
  limit: number;
};

export const PRESETS: Record<string, string[]> = {
  restaurant: ["amenity=restaurant"],
  cafe: ["amenity=cafe"],
  driving_school: ["amenity=driving_school", "shop=driving_school"],
  dentist: ["amenity=dentist"],
  clinic: ["amenity=clinic"],
  pharmacy: ["amenity=pharmacy"],
  gym: ["leisure=fitness_centre", "amenity=fitness_centre"],
  salon: ["shop=hairdresser", "shop=beauty"],
  bakery: ["shop=bakery"],
  hotel: ["tourism=hotel", "tourism=guest_house"],
  school: ["amenity=school"],
  mechanic: ["craft=car_repair", "shop=car_repair"],
  grocery: ["shop=supermarket", "shop=convenience"],
  bar: ["amenity=pub", "amenity=bar"],
};

const FILTER_RE = /^[a-zA-Z0-9_:]+=[a-zA-Z0-9_ .:@-]+$/;

export function resolveNiche(input: string): string[] | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;
  if (s.includes("=")) {
    const parts = s.split(",").map((p) => p.trim()).filter(Boolean);
    return parts.length && parts.every((p) => FILTER_RE.test(p)) ? parts : null;
  }
  return PRESETS[s.replace(/[\s-]+/g, "_")] ?? null;
}

export function buildOverpass(filters: string[], bbox: string, limit: number): string {
  const stmts = filters
    .map((f) => {
      const i = f.indexOf("=");
      return `  nwr["${f.slice(0, i)}"="${f.slice(i + 1)}"](${bbox});`;
    })
    .join("\n");
  return `[out:json][timeout:30];\n(\n${stmts}\n);\nout body center ${limit};`;
}

const first = (t: Record<string, string>, keys: string[]) =>
  keys.map((k) => t[k] ?? "").find(Boolean) ?? "";

export function parseOverpass(json: { elements?: unknown[] }): Lead[] {
  const leads: Lead[] = [];
  for (const raw of json.elements ?? []) {
    const el = raw as {
      tags?: Record<string, string>;
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
    };
    const t = el.tags;
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!t?.name || lat === undefined || lon === undefined) continue;

    const phone = first(t, ["phone", "contact:phone", "mobile", "contact:mobile"]);
    const digits = phone.replace(/\D/g, "");
    // ponytail: naive wa.me link (no country-code mapping) — leads break for local-format numbers like 0300…; add a country-code map when targeting multiple countries
    const whatsapp = digits.length >= 10 && digits.length <= 15 ? digits : "";

    const addr = [
      [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" "),
      t["addr:city"],
    ]
      .filter(Boolean)
      .join(", ");

    leads.push({
      name: t.name,
      address: t["addr:full"] ?? addr,
      phone,
      whatsapp,
      website: first(t, ["website", "contact:website", "url"]),
      email: first(t, ["email", "contact:email"]),
      lat,
      lon,
    });
  }
  return leads.sort(
    (a, b) =>
      contactScore(b) - contactScore(a) || a.name.localeCompare(b.name),
  );
}

const contactScore = (l: Lead) =>
  [l.phone, l.website, l.email, l.address].filter(Boolean).length;
