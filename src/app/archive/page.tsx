import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { formatDeadline, getMissedCutoff } from "@/lib/deadline";
import { prisma } from "@/lib/prisma";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-CA").format(value);
}

export default async function ArchivePage() {
  const user = await requireUser();
  const missedCutoff = getMissedCutoff();

  if (!user.role) {
    redirect("/onboarding");
  }

  if (user.role === "TRAINEE") {
    await prisma.workout.updateMany({
      where: {
        traineeId: user.id,
        isArchived: false,
        deadline: {
          lt: missedCutoff,
        },
      },
      data: {
        isArchived: true,
      },
    });
  }

  if (user.role === "TRAINER") {
    await prisma.workout.updateMany({
      where: {
        trainerId: user.id,
        isArchived: false,
        deadline: {
          lt: missedCutoff,
        },
      },
      data: {
        isArchived: true,
      },
    });
  }

  if (user.role === "TRAINEE") {
    const workouts = await prisma.workout.findMany({
      where: {
        traineeId: user.id,
        isArchived: true,
      },
      include: {
        group: {
          select: { name: true },
        },
        completions: {
          where: { userId: user.id },
        },
        exercises: {
          select: { volume: true },
        },
      },
      orderBy: { deadline: "desc" },
    });

    return (
      <DashboardShell>
        <section className="panel workout-panel">
          <p className="eyebrow">Archive</p>
          <h1 className="panel-title">Past Workouts</h1>
          <p className="panel-copy">Your completed workout records.</p>

          <div className="workout-grid">
            {workouts.length ? (
            workouts.map((workout) => (
              <article className="workout-card" key={workout.id}>
                <h2 className="workout-title">{workout.title}</h2>
                <p className="panel-copy">
                  {workout.dayLabel} | Deadline: {formatDeadline(workout.deadline)} | Group: {workout.group.name}
                </p>
                <p className="profile-bio">Status: {workout.completions.length > 0 ? "Done" : "Not done"}</p>
                <p className="profile-bio">
                  Total volume: {formatNumber(workout.exercises.reduce((sum, exercise) => sum + exercise.volume, 0))}
                </p>
              </article>
              ))
            ) : (
              <p className="panel-copy">Archive is empty.</p>
            )}
          </div>
        </section>
      </DashboardShell>
    );
  }

  const workouts = await prisma.workout.findMany({
    where: {
      trainerId: user.id,
      isArchived: true,
    },
    include: {
      trainee: {
        select: { name: true },
      },
      group: {
        select: { name: true },
      },
      completions: true,
      exercises: {
        select: { volume: true },
      },
    },
    orderBy: { deadline: "desc" },
  });

  return (
    <DashboardShell>
      <section className="panel workout-panel">
        <p className="eyebrow">Archive</p>
        <h1 className="panel-title">Past Workouts</h1>
        <p className="panel-copy">Archived workouts created by you.</p>

        <div className="workout-grid">
          {workouts.length ? (
            workouts.map((workout) => (
              <article className="workout-card" key={workout.id}>
                <h2 className="workout-title">{workout.title}</h2>
                <p className="panel-copy">
                  {workout.dayLabel} | Deadline: {formatDeadline(workout.deadline)} | Group: {workout.group.name}
                </p>
                <p className="profile-bio">Status: {workout.completions.length > 0 ? "Done" : "Not done"}</p>
                <p className="profile-bio">
                  Total volume: {formatNumber(workout.exercises.reduce((sum, exercise) => sum + exercise.volume, 0))}
                </p>
                <p className="profile-bio">Trainee: {workout.trainee.name}</p>
              </article>
            ))
          ) : (
            <p className="panel-copy">Archive is empty.</p>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
