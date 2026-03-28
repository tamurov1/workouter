import { redirect } from "next/navigation";
import { CommitmentMap } from "@/components/commitment-map";
import { DashboardShell } from "@/components/dashboard-shell";
import { ExpandableWorkoutCard } from "@/components/expandable-workout-card";
import { WorkoutPlanForm } from "@/components/workout-plan-form";
import { requireUser } from "@/lib/auth";
import { formatDeadline, formatDeadlineInput } from "@/lib/deadline";
import { prisma } from "@/lib/prisma";
import { getTrainerLeaderboardPoints } from "@/lib/trainer-points";

function buildInitialBlocks(
  exercises: Array<{
    id: string;
    name: string;
    sets: number;
    reps: number;
    load: number;
    rpe: number;
    explicitIntensity: number | null;
  }>,
) {
  const grouped = exercises.reduce<
    Array<{
      name: string;
      sets: number;
      rows: Array<(typeof exercises)[number]>;
    }>
  >((accumulator, exercise) => {
    const existing = accumulator.find((entry) => entry.name === exercise.name);

    if (existing) {
      existing.rows.push(exercise);
      return accumulator;
    }

    accumulator.push({
      name: exercise.name,
      sets: exercise.sets,
      rows: [exercise],
    });

    return accumulator;
  }, []);

  return grouped.map((group, blockIndex) => ({
    id: `workout-block-${blockIndex + 1}`,
    name: group.name,
    sets: String(group.sets),
    rows: group.rows.map((row, rowIndex) => ({
      id: `workout-row-${blockIndex + 1}-${rowIndex + 1}`,
      reps: String(row.reps),
      load: String(row.load),
      targetRpe: String(row.rpe),
      optionalIntensity: row.explicitIntensity === null ? "" : String(row.explicitIntensity),
    })),
  }));
}

type UserProfilePageProps = {
  params: Promise<{ traineeId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
};

export default async function UserProfilePage({ params, searchParams }: UserProfilePageProps) {
  const user = await requireUser();

  if (!user.role) {
    redirect("/onboarding");
  }

  const { traineeId: targetUserId } = await params;
  const query = await searchParams;

  if (targetUserId === user.id) {
    redirect("/profile");
  }

  const currentYear = new Date().getFullYear();

  const [targetUser, managedMemberships] = await Promise.all([
    prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        bio: true,
        avatarData: true,
        points: true,
        role: true,
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
    user.role === "TRAINER"
      ? prisma.groupMember.findMany({
          where: {
            userId: targetUserId,
            group: {
              trainerId: user.id,
            },
          },
          include: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            joinedAt: "asc",
          },
        })
      : Promise.resolve([]),
  ]);

  if (!targetUser || !targetUser.role) {
    redirect("/leaderboard");
  }

  const canManageTrainee =
    user.role === "TRAINER" &&
    targetUser.role === "TRAINEE" &&
    managedMemberships.length > 0;

  const [templates, managedWorkouts, publicWorkouts, commitments] = await Promise.all([
    canManageTrainee
      ? prisma.workoutTemplate.findMany({
          where: { trainerId: user.id },
          include: {
            exercises: {
              orderBy: { sortOrder: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    canManageTrainee
      ? prisma.workout.findMany({
          where: {
            trainerId: user.id,
            traineeId: targetUserId,
            isArchived: false,
          },
          include: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
            exercises: {
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                name: true,
                sets: true,
                reps: true,
                load: true,
                rpe: true,
                explicitIntensity: true,
              },
            },
            completions: true,
          },
          orderBy: { deadline: "asc" },
        })
      : Promise.resolve([]),
    targetUser.role === "TRAINEE"
      ? prisma.workout.findMany({
          where: {
            traineeId: targetUserId,
            isArchived: false,
          },
          select: {
            id: true,
            title: true,
            completions: {
              where: { userId: targetUserId },
              select: { id: true },
            },
          },
          orderBy: { deadline: "asc" },
        })
      : Promise.resolve([]),
    targetUser.role === "TRAINEE"
      ? prisma.workout.findMany({
          where: {
            traineeId: targetUserId,
            deadline: {
              gte: new Date(currentYear, 0, 1),
              lt: new Date(currentYear + 1, 0, 1),
            },
          },
          select: {
            deadline: true,
            completions: {
              where: { userId: targetUserId },
              select: { id: true },
            },
          },
          orderBy: { deadline: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const traineeOptions = canManageTrainee ? [{ id: targetUser.id, name: targetUser.name }] : [];
  const profileLabel =
    targetUser.role === "TRAINER" ? "Trainer Profile" : canManageTrainee ? "Trainee Profile" : "User Profile";
  const targetPoints =
    targetUser.role === "TRAINER" ? getTrainerLeaderboardPoints(targetUser) : targetUser.points;

  return (
    <DashboardShell>
      <section className="panel profile-panel compact-profile">
        <p className="eyebrow">{profileLabel}</p>
        <div className="profile-summary-row">
          <div className="profile-summary-main">
            <div className="avatar-shell small-avatar">
              {targetUser.avatarData ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={`${targetUser.name} avatar`} className="h-full w-full object-cover" src={targetUser.avatarData} />
              ) : (
                <span className="text-[10px] uppercase tracking-[0.18em] text-[#6f747a]">No image</span>
              )}
            </div>

            <div>
              <h1 className="profile-name">{targetUser.name}</h1>
              <p className="profile-bio">{targetUser.bio || "No bio added yet."}</p>
              <p className="profile-role">{targetUser.role === "TRAINEE" ? "Trainee" : "Trainer"}</p>
            </div>
          </div>

          <div className="profile-points-block">
            <p className="eyebrow">Points</p>
            <div className="points-inline-value">{targetPoints}</div>
          </div>
        </div>

        {canManageTrainee ? (
          <div className="sub-block">
            <p className="field-label">Groups</p>
            <div className="member-list">
              {managedMemberships.map((membership) => (
                <div className="member-row" key={membership.group.id}>
                  <p className="panel-copy">{membership.group.name}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {query.error && canManageTrainee ? <p className="status-error">{decodeURIComponent(query.error)}</p> : null}
        {query.saved && canManageTrainee ? <p className="status-success">Workout updated.</p> : null}
      </section>

      {targetUser.role === "TRAINEE" ? (
        <CommitmentMap
          items={commitments.map((workout) => ({
            deadline: workout.deadline,
            isDone: workout.completions.length > 0,
          }))}
          year={currentYear}
        />
      ) : null}

      <section className="panel workout-panel">
        <div className="workout-head">
          <p className="eyebrow">Workouts</p>
          <span className="panel-copy">
            {canManageTrainee ? "Trainer edit view" : targetUser.role === "TRAINEE" ? "Read-only view" : "Profile overview"}
          </span>
        </div>

        {canManageTrainee ? (
          <div className="workout-grid">
            {managedWorkouts.length ? (
              managedWorkouts.map((workout) => (
                <ExpandableWorkoutCard
                  key={workout.id}
                  deadline={formatDeadline(workout.deadline)}
                  description={workout.description}
                  group={workout.group.name}
                  status={workout.completions.length ? "Done" : "Not done"}
                  title={workout.title}
                >
                  <p className="profile-bio">
                    Editing a workout resets its current progress so the trainee sees the updated plan cleanly.
                  </p>

                  <WorkoutPlanForm
                    fixedTraineeId={targetUser.id}
                    groupId={workout.group.id}
                    initialBlocks={buildInitialBlocks(workout.exercises)}
                    initialDescription={workout.description}
                    initialDayLabel={workout.dayLabel}
                    initialDeadline={formatDeadlineInput(workout.deadline)}
                    initialTitle={workout.title}
                    mode="edit"
                    templates={templates}
                    trainees={traineeOptions}
                    workoutId={workout.id}
                  />
                </ExpandableWorkoutCard>
              ))
            ) : (
              <p className="panel-copy">No active workouts assigned to this trainee yet.</p>
            )}
          </div>
        ) : targetUser.role === "TRAINEE" ? (
          <div className="workout-grid">
            {publicWorkouts.length ? (
              publicWorkouts.map((workout) => (
                <article className="workout-card workout-card-readonly" key={workout.id}>
                  <div className="workout-card-readonly-head">
                    <h2 className="workout-title">{workout.title}</h2>
                    <span className="workout-status">{workout.completions.length ? "Done" : "Not done"}</span>
                  </div>
                </article>
              ))
            ) : (
              <p className="panel-copy">No active workouts to show.</p>
            )}
          </div>
        ) : (
          <p className="panel-copy">No workout history is available for trainer profiles.</p>
        )}
      </section>
    </DashboardShell>
  );
}
