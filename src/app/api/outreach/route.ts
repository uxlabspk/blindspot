import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateOutreach } from "@/lib/llm";
import type { Lead } from "@/lib/leads";

const s = (v: unknown, max = 400) => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session)
    return NextResponse.json({ error: "Sign in to generate outreach." }, { status: 401 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const lead: Lead = {
    name: s(o.name, 200),
    address: s(o.address),
    phone: s(o.phone),
    website: s(o.website, 500),
    email: s(o.email, 300),
    lat: num(o.lat),
    lon: num(o.lon),
    whatsapp: s(o.whatsapp),
  };
  if (!lead.name) return NextResponse.json({ error: "Business name required." }, { status: 400 });

  try {
    return NextResponse.json(await generateOutreach(lead));
  } catch (err) {
    console.error("outreach failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed." },
      { status: 502 },
    );
  }
}
