import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import Image from "next/image";

const FEATURES = [
  {
    title: "The blindspot, flagged",
    body: "Every business without a website is marked up front, so the outreach list writes itself.",
  },
  {
    title: "Contact-ready leads",
    body: "Name, address, phone, WhatsApp and email for each result, plus a jump to Google Maps.",
  },
  {
    title: "Export and go",
    body: "One click to a CSV for your cold outreach, filtered to exactly what is on screen.",
  },
];

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
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

      <main className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Find the local businesses with no website.
        </h1>
        <p className="mt-5 max-w-xl text-zinc-500">
          Enter a niche and a location. Blindspot lists every matching business,
          flags the ones with no website, and hands you the contact details to
          reach them.
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

        <ul className="mt-16 grid gap-6 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <li
              key={f.title}
              className="rounded border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <h2 className="text-sm font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm text-zinc-500">{f.body}</p>
            </li>
          ))}
        </ul>
      </main>

      <footer className="mx-auto max-w-5xl px-6 pb-10 text-xs text-zinc-400">
        Built on free and open data.
      </footer>
    </div>
  );
}
