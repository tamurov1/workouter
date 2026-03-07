import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function LeaderboardPage() {
  const user = await requireUser();

  if (!user.role) {
    redirect("/onboarding");
  }

  const topUsers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      role: true,
      points: true,
    },
    orderBy: [{ points: "desc" }, { createdAt: "asc" }],
    take: 15,
  });

  return (
    <DashboardShell>
      <section className="panel profile-panel">
        <p className="eyebrow">Leaderboard</p>
        <h1 className="panel-title">Top Performers</h1>
        <p className="panel-copy">Ranking sorted by points.</p>

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
