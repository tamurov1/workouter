import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTrainerLeaderboardPoints } from "@/lib/trainer-points";

type LeaderboardPageProps = {
  searchParams: Promise<{ view?: string }>;
};

type LeaderboardEntry = {
  id: string;
  name: string;
  bio: string;
  avatarData: string | null;
  points: number;
};

async function getTraineeLeaderboard() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      bio: true,
      avatarData: true,
      points: true,
      createdAt: true,
    },
    where: {
      role: "TRAINEE",
    },
    orderBy: [{ points: "desc" }, { createdAt: "asc" }],
    take: 15,
  });

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    bio: user.bio,
    avatarData: user.avatarData,
    points: user.points,
  }));
}

async function getTrainerLeaderboard() {
  const trainers = await prisma.user.findMany({
    where: {
      role: "TRAINER",
    },
    select: {
      id: true,
      name: true,
      bio: true,
      avatarData: true,
      createdAt: true,
      trainedGroups: {
        select: {
          memberships: {
            select: {
              user: {
                select: {
                  id: true,
                  role: true,
                  points: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return trainers
    .map((trainer) => {
      return {
        id: trainer.id,
        name: trainer.name,
        bio: trainer.bio,
        avatarData: trainer.avatarData,
        points: getTrainerLeaderboardPoints(trainer),
        createdAt: trainer.createdAt,
      };
    })
    .sort((left, right) => {
      if (right.points !== left.points) {
        return right.points - left.points;
      }

      return left.createdAt.getTime() - right.createdAt.getTime();
    })
    .slice(0, 15)
    .map<LeaderboardEntry>(({ id, name, bio, avatarData, points }) => ({
      id,
      name,
      bio,
      avatarData,
      points,
    }));
}

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const user = await requireUser();

  if (!user.role) {
    redirect("/onboarding");
  }

  const params = await searchParams;
  const requestedView = params.view === "trainees" ? "trainees" : "trainers";
  const activeView = user.role === "TRAINEE" ? "trainees" : requestedView;

  const entries = activeView === "trainers" ? await getTrainerLeaderboard() : await getTraineeLeaderboard();
  const title = activeView === "trainers" ? "Trainer Leaderboard" : "Trainee Leaderboard";
  const subtitle =
    activeView === "trainers"
      ? "Ranking of trainers by the total points earned by their trainees across the groups they run."
      : "Ranking of trainees by earned points.";

  return (
    <DashboardShell>
      <section className="panel profile-panel">
        <p className="eyebrow">Leaderboard</p>
        <h1 className="panel-title">{title}</h1>
        <p className="panel-copy">{subtitle}</p>

        {user.role === "TRAINER" ? (
          <div className="leaderboard-toggle">
            <Link
              className={activeView === "trainers" ? "primary-button text-center" : "secondary-button text-center"}
              href="/leaderboard?view=trainers"
            >
              Trainers
            </Link>
            <Link
              className={activeView === "trainees" ? "primary-button text-center" : "secondary-button text-center"}
              href="/leaderboard?view=trainees"
            >
              Trainees
            </Link>
          </div>
        ) : null}

        <div className="leaderboard-list">
          {entries.map((entry, index) => (
            <Link
              className="leaderboard-row leaderboard-row-link"
              href={entry.id === user.id ? "/profile" : `/profile/${entry.id}`}
              key={entry.id}
            >
              <span className="leaderboard-rank">{String(index + 1).padStart(2, "0")}</span>
              <div className="avatar-shell leaderboard-avatar">
                {entry.avatarData ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={`${entry.name} avatar`} className="h-full w-full object-cover" src={entry.avatarData} />
                ) : (
                  <span className="leaderboard-avatar-fallback">{entry.name.slice(0, 1)}</span>
                )}
              </div>
              <div className="leaderboard-profile">
                <div>
                  <p className="leaderboard-identity">
                    <span className="leaderboard-name">{entry.name}</span>
                    <span className="leaderboard-divider">/</span>
                    <span className="leaderboard-bio">{entry.bio || "No description added yet."}</span>
                  </p>
                </div>
              </div>
              <span className="leaderboard-points">{entry.points}</span>
            </Link>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
