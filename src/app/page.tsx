import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import Image from "next/image";

const FEATURES = [
  {
    title: "The blindspot, flagged",
    body: "Every business without a website is marked up front, so the outreach list writes itself. Filter the whole table to websiteless leads in one click.",
  },
  {
    title: "Contact-ready leads",
    body: "Name, address, phone, WhatsApp and email for each result, sorted by how much contact data the business has published, plus a jump to Google Maps.",
  },
  {
    title: "Saved searches",
    body: "Every search is stored per account. Reopen a past niche and location from the sidebar and the results replay instantly, without re-querying the map.",
  },
  {
    title: "AI outreach drafts",
    body: "Open a lead and get a WhatsApp message, email subject and body written for that specific business — ready to copy, edit and send.",
  },
  {
    title: "Export and go",
    body: "One click to a CSV for your sequencer or spreadsheet, filtered to exactly what is on screen.",
  },
  {
    title: "Free open data",
    body: "Built on OpenStreetMap instead of a paid lead database. No credits, no per-lead pricing, no stale resold lists.",
  },
];

const STEPS = [
  {
    title: "1. Pick a niche",
    body: "Type a plain-English niche like restaurant, dentist, gym or mechanic — or bring your own Overpass filter such as amenity=cafe, shop=beauty.",
  },
  {
    title: "2. Set the location",
    body: "Any town or city. Blindspot geocodes it to a bounding box, so results are limited to that area instead of a whole country.",
  },
  {
    title: "3. Read the map",
    body: "Blindspot queries Overpass for matching businesses, keeps the named ones near the centre, and shows who has a website and who doesn't.",
  },
  {
    title: "4. Reach out",
    body: "Filter to the websiteless, export the CSV or open a lead for an AI-drafted WhatsApp and email pitch. You send it — nothing goes out automatically.",
  },
];

const NICHES = [
  "restaurants",
  "cafes",
  "dentists",
  "clinics",
  "pharmacies",
  "gyms",
  "hair salons",
  "bakeries",
  "hotels",
  "schools",
  "driving schools",
  "car mechanics",
  "grocery stores",
  "bars and pubs",
];

const AUDIENCE = [
  {
    title: "Web design agencies",
    body: "A local business with no website is the warmest prospect you will ever find — the problem is public, the pitch writes itself, and nobody else is sending it yet.",
  },
  {
    title: "Freelance web developers",
    body: "Skip the lead-marketplace subscriptions. Search your own city by niche, keep the shortlist, and start with the businesses you can walk to.",
  },
  {
    title: "Local marketing consultants",
    body: "Show a prospect their missing online presence with hard numbers: how many businesses in their niche in their town still have no site at all.",
  },
];

const FAQ = [
  {
    q: "What is Blindspot?",
    a: "Blindspot is a lead finder for people who sell websites to local businesses. Enter a niche and a location and it returns every matching business in that area, flags the ones with no website, and gives you the contact details to reach them.",
  },
  {
    q: "Where does the lead data come from?",
    a: "OpenStreetMap, through the Nominatim geocoder and the Overpass API. It is free, open data maintained by a global community — not a purchased or resold lead list. Coverage depends on how well the area is mapped.",
  },
  {
    q: "How does Blindspot know a business has no website?",
    a: "It reads the business's own OpenStreetMap record. When there is no contact:website tag (and no website tag), the lead is flagged as having no online presence. The filter shows only those leads.",
  },
  {
    q: "Can I export the leads?",
    a: "Yes. Export CSV gives you the current view — name, address, phone, WhatsApp, website, email, latitude and longitude — ready for a spreadsheet or outreach tool.",
  },
  {
    q: "Does Blindspot send emails or messages for me?",
    a: "No. It drafts the WhatsApp message and email for you with AI, and you copy, edit and send them yourself. You stay in control of every message that leaves your outbox.",
  },
  {
    q: "How many results does one search return?",
    a: "Up to 300 businesses per niche and location, controlled by the limit slider. Narrow the location or split the niche if you want to go deeper.",
  },
  {
    q: "Do I need API keys for maps or leads?",
    a: "No keys, no credits, no per-lead fees. The map data is open, and your saved searches and drafts live in your own account.",
  },
];

// one section header so every block shares the hero's pill + heading style
function Section({
  id,
  eyebrow,
  title,
  sub,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-24 text-center">
      <p className="mx-auto flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-white/70 px-3 py-1 text-xs text-zinc-600 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-400">
        <span className="h-1.5 w-1.5 rounded-full bg-coral" />
        {eyebrow}
      </p>
      <h2 id={id} className="mx-auto mt-4 max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h2>
      {sub && <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-500">{sub}</p>}
      <div className="mt-8">{children}</div>
    </section>
  );
}

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <div className="relative isolate min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100">
      {/* page-wide glow — same coral/grey palette as the hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(55% 45% at 25% 12%, rgba(255,107,74,0.16), transparent 70%), radial-gradient(45% 40% at 85% 45%, rgba(161,161,170,0.14), transparent 70%), radial-gradient(50% 45% at 30% 95%, rgba(255,107,74,0.10), transparent 70%)",
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="mx-auto flex container items-center justify-between px-6 py-5">
        {/*<span className="text-lg font-semibold tracking-tight">Blind<span className="text-coral">spot</span></span>*/}
        <Image src={'/logo.svg'} width={180} height={180} alt="Blindspot" />
        <nav className="flex items-center gap-2 text-sm">
          {session ? (
            <>
              <span className="hidden px-3 text-zinc-500 sm:block">
                {session.user.email}
              </span>
              <Link
                href="/dashboard"
                className="rounded bg-zinc-900 px-3 py-1.5 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
              >
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded bg-zinc-900 px-3 py-1.5 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto container px-6 py-16 sm:py-24">
        {/* hero section */}
        <div className="flex min-h-[75vh] scroll-mt-16 flex-col items-center justify-center py-16 text-center md:min-h-[70vh]">
          <p className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white/70 px-3 py-1 text-xs text-zinc-600 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-coral" />
            Free · Open data · No API keys
          </p>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Find the local businesses with{" "}
            <span className="text-coral">no website</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-zinc-500">
            Enter a niche and a location. Blindspot lists every matching
            business, flags the ones with no website, and hands you the contact
            details to reach them.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {session ? (
              <Link
                href="/dashboard"
                className="rounded bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
              >
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="rounded bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Get started free
                </Link>
                <Link
                  href="/login"
                  className="rounded border border-zinc-300 px-5 py-2.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  Log in
                </Link>
              </>
            )}
          </div>

          <p className="mt-6 text-xs text-zinc-400">
            Up to 300 leads per search · CSV export · AI outreach drafts
          </p>
        </div>

        <Section
          id="how-heading"
          eyebrow="How it works"
          title="How Blindspot finds your next client"
          sub="From a plain-English niche to a ready-to-send pitch in four steps — no lead database, no API keys, no manual map browsing."
        >
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li
                key={s.title}
                className="rounded border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <h3 className="text-sm font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-zinc-500">{s.body}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section
          id="features-heading"
          eyebrow="Features"
          title="Everything a lead list should include"
        >
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li
                key={f.title}
                className="rounded border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <h3 className="text-sm font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-zinc-500">{f.body}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          id="niches-heading"
          eyebrow="Niches"
          title="Search any local business niche"
          sub="Presets cover the niches agencies sell to most often, and anything else works too — type an OpenStreetMap filter directly. Popular searches include:"
        >
          <ul className="flex flex-wrap gap-2">
            {NICHES.map((n) => (
              <li
                key={n}
                className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"
              >
                {n}
              </li>
            ))}
          </ul>
        </Section>

        <Section
          id="who-heading"
          eyebrow="Use cases"
          title="Who Blindspot is for"
        >
          <ul className="grid gap-6 sm:grid-cols-3">
            {AUDIENCE.map((a) => (
              <li
                key={a.title}
                className="rounded border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <h3 className="text-sm font-semibold">{a.title}</h3>
                <p className="mt-2 text-sm text-zinc-500">{a.body}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="faq-heading" eyebrow="FAQ" title="Frequently asked questions">
          <div className="mx-auto max-w-3xl divide-y divide-zinc-200 dark:divide-zinc-800">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-center gap-2 text-center text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="inline-block text-coral transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-zinc-500">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </Section>

        <Section id="cta-heading" eyebrow="Get started" title="Your next client is on the map — just not on the internet.">
          <div className="relative isolate overflow-hidden rounded border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10"
              style={{
                background:
                  "radial-gradient(55% 70% at 20% 20%, rgba(255,107,74,0.14), transparent 70%), radial-gradient(45% 60% at 85% 80%, rgba(161,161,170,0.12), transparent 70%)",
              }}
            />
            <p className="mx-auto max-w-xl text-sm text-zinc-500">
              Create a free account, run your first search, and see how many
              businesses in your city are still invisible online.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href={session ? "/dashboard" : "/signup"}
                className="rounded bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {session ? "Go to dashboard" : "Get started free"}
              </Link>
              <Link
                href="/login"
                className="rounded border border-zinc-300 px-5 py-2.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Log in
              </Link>
            </div>
          </div>
        </Section>
      </main>

      <footer className="mx-auto max-w-5xl px-6 pb-10 text-xs text-zinc-400">
        Built on free and open data — OpenStreetMap contributors, Nominatim and
        Overpass.
      </footer>
    </div>
  );
}
