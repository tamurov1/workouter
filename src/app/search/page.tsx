import { redirect } from "next/navigation";
import { requestJoinGroupAction } from "@/app/actions";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SearchPageProps = {
  searchParams: Promise<{ q?: string; error?: string; saved?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const user = await requireUser();

  if (!user.role) {
    redirect("/onboarding");
  }

  const params = await searchParams;
  const query = (params.q ?? "").trim();

  const groups = await prisma.group.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query } },
            { description: { contains: query } },
          ],
        }
      : undefined,
    include: {
      trainer: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          memberships: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const memberships =
    user.role === "TRAINEE"
      ? await prisma.groupMember.findMany({
          where: { userId: user.id },
          select: { groupId: true },
        })
      : [];

  const pendingRequests =
    user.role === "TRAINEE"
      ? await prisma.groupJoinRequest.findMany({
          where: {
            userId: user.id,
            status: "PENDING",
          },
          select: { groupId: true },
        })
      : [];

  const memberGroupIds = new Set(memberships.map((m) => m.groupId));
  const pendingGroupIds = new Set(pendingRequests.map((r) => r.groupId));

  return (
    <DashboardShell>
      <section className="panel profile-panel">
        <p className="eyebrow">Search</p>
        <h1 className="panel-title">Find Groups</h1>
        <p className="panel-copy">Search training groups and request access.</p>

        {params.error ? <p className="status-error">{decodeURIComponent(params.error)}</p> : null}
        {params.saved ? <p className="status-success">Join request sent.</p> : null}

        <form action="/search" className="search-row" method="get">
          <input className="field-input" defaultValue={query} name="q" placeholder="Search by group name" />
          <button className="primary-button" type="submit">
            Search
          </button>
        </form>

        <div className="group-grid">
          {groups.map((group) => {
            const isMember = memberGroupIds.has(group.id);
            const isPending = pendingGroupIds.has(group.id);

            return (
              <article className="workout-card" key={group.id}>
                <h2 className="workout-title">{group.name}</h2>
                <p className="panel-copy">Trainer: {group.trainer.name}</p>
                <p className="profile-bio">Members: {group._count.memberships}</p>
                <p className="profile-bio">{group.description || "No description"}</p>

                {user.role === "TRAINEE" ? (
                  isMember ? (
                    <p className="status-chip">Joined</p>
                  ) : isPending ? (
                    <p className="status-chip">Pending</p>
                  ) : (
                    <form action={requestJoinGroupAction}>
                      <input name="groupId" type="hidden" value={group.id} />
                      <button className="secondary-button" type="submit">
                        Request Join
                      </button>
                    </form>
                  )
                ) : (
                  <p className="status-chip">Trainer view</p>
                )}
              </article>
            );
          })}

          {!groups.length ? <p className="panel-copy">No groups found.</p> : null}
        </div>
      </section>
    </DashboardShell>
  );
}
