import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Dashboard from "./leads";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const searches = await prisma.search.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });

  return (
    <Dashboard
      name={session.user.name}
      email={session.user.email}
      searches={searches.map((s) => ({
        id: s.id,
        niche: s.niche,
        location: s.location,
        limit: s.limit,
      }))}
    />
  );
}
