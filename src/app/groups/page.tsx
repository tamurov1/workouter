import { redirect } from "next/navigation";
import {
  createGroupAction,
  reviewJoinRequestAction,
} from "@/app/actions";
import { DashboardShell } from "@/components/dashboard-shell";
import { WorkoutPlanForm } from "@/components/workout-plan-form";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type GroupsPageProps = {
  searchParams: Promise<{ error?: string; saved?: string }>;
};

export default async function GroupsPage({ searchParams }: GroupsPageProps) {
  const user = await requireUser();

  if (!user.role) {
    redirect("/onboarding");
  }

  const params = await searchParams;

  if (user.role === "TRAINER") {
    const groups = await prisma.group.findMany({
      where: { trainerId: user.id },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        joinRequests: {
          where: { status: "PENDING" },
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return (
      <DashboardShell>
        <section className="panel profile-panel">
          <p className="eyebrow">Groups</p>
          <h1 className="panel-title">Trainer Group Management</h1>
          <p className="panel-copy">Create groups, review join requests, and assign workouts.</p>

          {params.error ? <p className="status-error">{decodeURIComponent(params.error)}</p> : null}
          {params.saved ? <p className="status-success">Saved.</p> : null}

          <form action={createGroupAction} className="form-stack">
            <label className="field-label" htmlFor="group-name">
              New Group Name
            </label>
            <input className="field-input" id="group-name" name="name" required type="text" />

            <label className="field-label" htmlFor="group-description">
              Description
            </label>
            <textarea className="field-input min-h-20 resize-y" id="group-description" name="description" />

            <button className="primary-button" type="submit">
              Create Group
            </button>
          </form>
        </section>

        <section className="panel profile-panel">
          <p className="eyebrow">Your Groups</p>
          <div className="group-grid">
            {groups.map((group) => {
              const trainees = group.memberships
                .filter((membership) => membership.user.role === "TRAINEE")
                .map((membership) => ({ id: membership.user.id, name: membership.user.name }));

              return (
                <article className="workout-card" key={group.id}>
                  <h2 className="workout-title">{group.name}</h2>
                  <p className="profile-bio">{group.description || "No description"}</p>

                  <div className="sub-block">
                    <p className="field-label">Join Requests</p>
                    {group.joinRequests.length ? (
                      group.joinRequests.map((request) => (
                        <div className="request-row" key={request.id}>
                          <p className="panel-copy">
                            {request.user.name} ({request.user.email})
                          </p>
                          <div className="request-actions">
                            <form action={reviewJoinRequestAction}>
                              <input name="requestId" type="hidden" value={request.id} />
                              <input name="decision" type="hidden" value="ACCEPT" />
                              <button className="secondary-button" type="submit">
                                Accept
                              </button>
                            </form>
                            <form action={reviewJoinRequestAction}>
                              <input name="requestId" type="hidden" value={request.id} />
                              <input name="decision" type="hidden" value="DECLINE" />
                              <button className="secondary-button" type="submit">
                                Decline
                              </button>
                            </form>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="panel-copy">No pending requests.</p>
                    )}
                  </div>

                  <div className="sub-block">
                    <p className="field-label">Assign Workout</p>
                    <WorkoutPlanForm groupId={group.id} trainees={trainees} />
                  </div>
                </article>
              );
            })}

            {!groups.length ? <p className="panel-copy">You have no groups yet.</p> : null}
          </div>
        </section>
      </DashboardShell>
    );
  }

  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id },
    include: {
      group: {
        include: {
          trainer: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <DashboardShell>
      <section className="panel profile-panel">
        <p className="eyebrow">Groups</p>
        <h1 className="panel-title">Your Groups</h1>
        <p className="panel-copy">Groups where your trainer can assign workouts.</p>

        <div className="group-grid">
          {memberships.map((membership) => (
            <article className="workout-card" key={membership.id}>
              <h2 className="workout-title">{membership.group.name}</h2>
              <p className="panel-copy">Trainer: {membership.group.trainer.name}</p>
              <p className="profile-bio">{membership.group.description || "No description"}</p>
            </article>
          ))}
          {!memberships.length ? <p className="panel-copy">You are not in a group yet.</p> : null}
        </div>
      </section>
    </DashboardShell>
  );
}
