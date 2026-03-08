import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function LeaderboardPage() {
  const user = await requireUser();

  if (!user.role) {
    redirect("/onboarding");
  }

  const roleFilter = user.role;

  const topUsers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      role: true,
      points: true,
    },
    where: {
      role: roleFilter,
    },
    orderBy: [{ points: "desc" }, { createdAt: "asc" }],
    take: 15,
  });

  const title = user.role === "TRAINER" ? "Trainer Leaderboard" : "Trainee Leaderboard";
  const subtitle =
    user.role === "TRAINER"
      ? "Ranking of trainers by points."
      : "Ranking of trainees by points.";

  return (
    <DashboardShell>
      <section className="panel profile-panel">
        <p className="eyebrow">Leaderboard</p>
        <h1 className="panel-title">{title}</h1>
        <p className="panel-copy">{subtitle}</p>

        <div className="leaderboard-list">
          {topUsers.map((entry, index) => (
            <article className="leaderboard-row" key={entry.id}>
              <span className="leaderboard-rank">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <p className="leaderboard-name">{entry.name}</p>
                <p className="profile-bio">{entry.role === "TRAINEE" ? "Trainee" : "Trainer"}</p>
              </div>
              <span className="leaderboard-points">{entry.points}</span>
            </article>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
