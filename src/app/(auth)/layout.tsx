import Link from "next/link";
import Image from "next/image";
import { RedirectIfAuthed } from "./forms";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-screen flex-col bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100">
      {/* same coral/grey glow as the landing page */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(55% 45% at 25% 12%, rgba(255,107,74,0.16), transparent 70%), radial-gradient(45% 40% at 85% 45%, rgba(161,161,170,0.14), transparent 70%), radial-gradient(50% 45% at 30% 95%, rgba(255,107,74,0.10), transparent 70%)",
        }}
      />
      <RedirectIfAuthed />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
        <Link href="/" className="mx-auto block" aria-label="Blindspot home">
          <Image src="/logo.svg" alt="Blindspot" width={180} height={180} />
        </Link>
        <p className="mx-auto mb-4 mt-2 flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-white/70 px-3 py-1 text-xs text-zinc-600 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-400">
          <span className="h-1.5 w-1.5 rounded-full bg-coral" />
          Lead finder
        </p>
        <div className="rounded border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          {children}
        </div>
      </main>
    </div>
  );
}
