import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Lead } from "@/lib/leads";
import Dashboard from "../../dashboard/leads";

export default async function SearchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const { id } = await params;

  // userId in the where clause → someone else's id is a 404
  const search = await prisma.search.findFirst({ where: { id, userId: session.user.id } });
  if (!search) notFound();

  const searches = await prisma.search.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });

  return (
    <Dashboard
      name={session.user.name}
      email={session.user.email}
      searches={searches.map((row) => ({
        id: row.id,
        niche: row.niche,
        location: row.location,
        limit: row.limit,
      }))}
      initial={{
        niche: search.niche,
        location: search.location,
        limit: search.limit,
        area: search.area ?? "",
        // rows saved before `results` existed render empty — the form is prefilled,
        // so one Search click backfills the same row and lands back here
        leads: (search.results as Lead[] | null) ?? [],
      }}
    />
  );
}
