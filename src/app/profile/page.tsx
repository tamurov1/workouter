import { redirect } from "next/navigation";
import Link from "next/link";
import { resetExerciseSetAction } from "@/app/actions";
import { CommitmentMap } from "@/components/commitment-map";
import { DashboardShell } from "@/components/dashboard-shell";
import { ExpandableExerciseCard } from "@/components/expandable-exercise-card";
import { ExpandableWorkoutCard } from "@/components/expandable-workout-card";
import { ExerciseRpeForm } from "@/components/exercise-rpe-form";
import { requireUser } from "@/lib/auth";
import { formatDeadline, getMissedCutoff } from "@/lib/deadline";
import { prisma } from "@/lib/prisma";
import { getTrainerLeaderboardPoints } from "@/lib/trainer-points";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-CA").format(value);
}

type ProfilePageProps = {
  searchParams: Promise<{ error?: string; saved?: string }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
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

  const traineeCommitments =
    user.role === "TRAINEE"
      ? await prisma.workout.findMany({
          where: {
            traineeId: user.id,
            deadline: {
              gte: new Date(new Date().getFullYear(), 0, 1),
              lt: new Date(new Date().getFullYear() + 1, 0, 1),
            },
          },
          select: {
            deadline: true,
            completions: {
              where: { userId: user.id },
              select: { id: true },
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
                id: true,
                name: true,
              },
            },
            group: {
              select: {
                name: true,
              },
            },
            exercises: {
              select: {
                volume: true,
              },
            },
            completions: true,
          },
          orderBy: { deadline: "asc" },
          take: 20,
        })
      : [];

  const trainerPoints =
    user.role === "TRAINER"
      ? getTrainerLeaderboardPoints(
          await prisma.user.findUniqueOrThrow({
            where: { id: user.id },
            select: {
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
          }),
        )
      : user.points;

  return (
    <DashboardShell>
      <section className="panel profile-panel compact-profile">
        <p className="eyebrow">Profile</p>
        <div className="profile-summary-row">
          <div className="profile-summary-main">
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

          <div className="profile-points-block">
            <p className="eyebrow">Points</p>
            <div className="points-inline-value">{trainerPoints}</div>
          </div>
        </div>

        {params.error ? <p className="status-error">{decodeURIComponent(params.error)}</p> : null}
        {params.saved ? <p className="status-success">Set updated.</p> : null}
      </section>

      {user.role === "TRAINEE" ? (
        <CommitmentMap
          items={traineeCommitments.map((workout) => ({
            deadline: workout.deadline,
            isDone: workout.completions.length > 0,
          }))}
        />
      ) : null}

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
                const totalVolume = workout.exercises.reduce((sum, exercise) => sum + exercise.volume, 0);
                const exerciseGroups = workout.exercises.reduce<
                  Array<{
                    name: string;
                    rows: Array<(typeof workout.exercises)[number]>;
                  }>
                >((accumulator, exercise) => {
                  const existing = accumulator.find((entry) => entry.name === exercise.name);

                  if (existing) {
                    existing.rows.push(exercise);
                    return accumulator;
                  }

                  accumulator.push({
                    name: exercise.name,
                    rows: [exercise],
                  });

                  return accumulator;
                }, []);

                return (
                  <ExpandableWorkoutCard
                    key={workout.id}
                    deadline={formatDeadline(workout.deadline)}
                    description={workout.description}
                    group={workout.group.name}
                    status={done ? "Done" : "Not done"}
                    title={workout.title}
                  >
                    <p className="profile-bio">Total volume: {formatNumber(totalVolume)}</p>
                    <p className="profile-bio">
                      Enter actual RPE once per set. Next set load updates automatically from that value.
                    </p>

                    <div className="exercise-group-list">
                      {exerciseGroups.map((group) => (
                        <ExpandableExerciseCard
                          key={`${workout.id}-${group.name}`}
                          subtitle={`${group.rows.length} sets`}
                          title={group.name}
                        >
                          <div className="exercise-table-wrap">
                            <table className="exercise-table">
                              <thead>
                                <tr>
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
                                {group.rows.map((exercise) => (
                                  <tr key={exercise.id}>
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
                                        <ExerciseRpeForm
                                          defaultValue={exercise.rpe.toFixed(1)}
                                          exerciseId={exercise.id}
                                        />
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
                        </ExpandableExerciseCard>
                      ))}
                    </div>
                  </ExpandableWorkoutCard>
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
                const totalVolume = workout.exercises.reduce((sum, exercise) => sum + exercise.volume, 0);

                return (
                  <ExpandableWorkoutCard
                    key={workout.id}
                    deadline={formatDeadline(workout.deadline)}
                    description={workout.description}
                    group={workout.group.name}
                    status={done ? "Done" : "Not done"}
                    title={workout.title}
                  >
                    <p className="profile-bio">Total volume: {formatNumber(totalVolume)}</p>
                    <p className="profile-bio">Trainee: {workout.trainee.name}</p>
                    <div className="card-actions">
                      <Link className="secondary-button text-center" href={`/profile/${workout.trainee.id}`}>
                        Open Trainee Profile
                      </Link>
                    </div>
                  </ExpandableWorkoutCard>
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
