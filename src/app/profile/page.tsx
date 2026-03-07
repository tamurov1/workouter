import { redirect } from "next/navigation";
import { completeExerciseSetAction, resetExerciseSetAction } from "@/app/actions";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(value);
}

type ProfilePageProps = {
  searchParams: Promise<{ error?: string; saved?: string }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const user = await requireUser();

  if (!user.role) {
    redirect("/onboarding");
  }

  if (user.role === "TRAINEE") {
    await prisma.workout.updateMany({
      where: {
        traineeId: user.id,
        isArchived: false,
        deadline: {
          lt: new Date(),
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
          lt: new Date(),
        },
      },
      data: {
        isArchived: true,
      },
    });
  }

  const params = await searchParams;

  const traineeWorkouts =
    user.role === "TRAINEE"
      ? await prisma.workout.findMany({
          where: {
            traineeId: user.id,
            isArchived: false,
          },
          include: {
            exercises: {
              orderBy: { sortOrder: "asc" },
            },
            completions: {
              where: { userId: user.id },
            },
            group: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { deadline: "asc" },
        })
      : [];

  const trainerWorkouts =
    user.role === "TRAINER"
      ? await prisma.workout.findMany({
          where: {
            trainerId: user.id,
            isArchived: false,
          },
          include: {
            trainee: {
              select: {
                name: true,
              },
            },
            group: {
              select: {
                name: true,
              },
            },
            completions: true,
          },
          orderBy: { deadline: "asc" },
          take: 20,
        })
      : [];

  return (
    <DashboardShell>
      <section className="panel profile-panel compact-profile">
        <p className="eyebrow">Profile</p>
        <div className="profile-summary-row">
          <div className="avatar-shell small-avatar">
            {user.avatarData ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={`${user.name} avatar`} className="h-full w-full object-cover" src={user.avatarData} />
            ) : (
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#6f747a]">No image</span>
            )}
          </div>

          <div>
            <h1 className="profile-name">{user.name}</h1>
            <p className="profile-bio">{user.bio || "No bio added yet."}</p>
            <p className="profile-role">{user.role === "TRAINEE" ? "Trainee" : "Trainer"}</p>
          </div>
        </div>

        <div className="points-inline">
          <p className="eyebrow">Points</p>
          <div className="points-inline-value">{user.points}</div>
        </div>

        {params.error ? <p className="status-error">{decodeURIComponent(params.error)}</p> : null}
        {params.saved ? <p className="status-success">Set updated.</p> : null}
      </section>

      <section className="panel workout-panel">
        <div className="workout-head">
          <p className="eyebrow">Workout</p>
          <span className="panel-copy">{user.role === "TRAINEE" ? "Assigned to you" : "Assigned by you"}</span>
        </div>

        {user.role === "TRAINEE" ? (
          <div className="workout-grid">
            {traineeWorkouts.length ? (
              traineeWorkouts.map((workout) => {
                const done = workout.completions.length > 0;

                return (
                  <article className="workout-card" key={workout.id}>
                    <div className="workout-meta-line">
                      <h2 className="workout-title">{workout.title}</h2>
                      <span className="workout-status">{done ? "Done" : "In progress"}</span>
                    </div>
                    <p className="panel-copy">
                      {workout.dayLabel} | Deadline: {formatDate(workout.deadline)} | Group: {workout.group.name}
                    </p>

                    <div className="exercise-table-wrap">
                      <table className="exercise-table">
                        <thead>
                          <tr>
                            <th>Exercise</th>
                            <th>Set</th>
                            <th>Reps</th>
                            <th>Load</th>
                            <th>Target RPE</th>
                            <th>Actual RPE</th>
                            <th>Intensity %</th>
                            <th>Volume</th>
                            <th>Done</th>
                          </tr>
                        </thead>
                        <tbody>
                          {workout.exercises.map((exercise) => (
                            <tr key={exercise.id}>
                              <td>{exercise.name}</td>
                              <td>
                                {exercise.setNumber}/{exercise.sets}
                              </td>
                              <td>{exercise.reps}</td>
                              <td>{exercise.load.toFixed(1)}</td>
                              <td>{exercise.rpe.toFixed(1)}</td>
                              <td>
                                {exercise.isCompleted ? (
                                  exercise.actualRpe?.toFixed(1)
                                ) : (
                                  <form action={completeExerciseSetAction} className="exercise-inline-form">
                                    <input name="exerciseId" type="hidden" value={exercise.id} />
                                    <input
                                      className="mini-input"
                                      defaultValue={exercise.rpe.toFixed(1)}
                                      max={10}
                                      min={6}
                                      name="actualRpe"
                                      step="0.5"
                                      type="number"
                                    />
                                    <input
                                      className="mini-input"
                                      defaultValue={exercise.reps}
                                      min={1}
                                      name="completedReps"
                                      type="number"
                                    />
                                    <input
                                      className="mini-input"
                                      defaultValue={exercise.load.toFixed(1)}
                                      min={0}
                                      name="loadUsed"
                                      step="0.5"
                                      type="number"
                                    />
                                    <button className="mini-check" type="submit">
                                      Save
                                    </button>
                                  </form>
                                )}
                              </td>
                              <td>{exercise.intensity ? exercise.intensity.toFixed(1) : "-"}</td>
                              <td>{exercise.volume}</td>
                              <td>
                                {exercise.isCompleted ? (
                                  <form action={resetExerciseSetAction}>
                                    <input name="exerciseId" type="hidden" value={exercise.id} />
                                    <button className="mini-check" type="submit">
                                      Undo
                                    </button>
                                  </form>
                                ) : (
                                  "No"
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="panel-copy">No active workouts assigned yet.</p>
            )}
          </div>
        ) : (
          <div className="workout-grid">
            {trainerWorkouts.length ? (
              trainerWorkouts.map((workout) => {
                const done = workout.completions.length > 0;

                return (
                  <article className="workout-card" key={workout.id}>
                    <div className="workout-meta-line">
                      <h2 className="workout-title">{workout.title}</h2>
                      <span className="workout-status">{done ? "Completed" : "In progress"}</span>
                    </div>
                    <p className="panel-copy">
                      {workout.dayLabel} | Deadline: {formatDate(workout.deadline)} | Trainee: {workout.trainee.name}
                    </p>
                    <p className="profile-bio">Group: {workout.group.name}</p>
                  </article>
                );
              })
            ) : (
              <p className="panel-copy">No active workouts created yet.</p>
            )}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
