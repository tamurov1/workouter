"use server";

import { JoinRequestStatus, UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ensureAppSchema } from "@/lib/ensure-app-schema";
import { ensureAuthSchema } from "@/lib/ensure-auth-schema";
import {
  calculateVolume,
  estimateE1rm,
  lookupIntensityPercent,
  roundToIncrement,
} from "@/lib/rpe";
import {
  createSession,
  destroySession,
  getCurrentUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function toErrorMessage(error: string, fallback: string) {
  return encodeURIComponent(error || fallback);
}

async function requireOnboardedUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin");
  }

  if (!user.role) {
    redirect("/onboarding");
  }

  await ensureAppSchema();

  return user;
}

async function syncWorkoutCompletion(workoutId: string, userId: string) {
  const [incompleteCount, existingCompletion] = await Promise.all([
    prisma.workoutExercise.count({
      where: {
        workoutId,
        isCompleted: false,
      },
    }),
    prisma.workoutCompletion.findUnique({
      where: {
        workoutId_userId: {
          workoutId,
          userId,
        },
      },
    }),
  ]);

  if (incompleteCount === 0 && !existingCompletion) {
    await prisma.$transaction([
      prisma.workoutCompletion.create({
        data: {
          workoutId,
          userId,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { points: { increment: 10 } },
      }),
    ]);
  }

  if (incompleteCount > 0 && existingCompletion) {
    await prisma.$transaction([
      prisma.workoutCompletion.delete({
        where: {
          workoutId_userId: {
            workoutId,
            userId,
          },
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { points: { decrement: 10 } },
      }),
    ]);
  }
}

export async function signUpAction(formData: FormData) {
  await ensureAuthSchema();

  const name = readText(formData, "name");
  const email = readText(formData, "email").toLowerCase();
  const password = readText(formData, "password");

  if (!name || !email || !password) {
    redirect(`/signup?error=${toErrorMessage("All fields are required.", "Invalid input")}`);
  }

  if (password.length < 8) {
    redirect(`/signup?error=${toErrorMessage("Password must be at least 8 characters.", "Invalid password")}`);
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    redirect(`/signup?error=${toErrorMessage("An account with this email already exists.", "User exists")}`);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
    },
  });

  await createSession(user.id);
  redirect("/onboarding");
}

export async function signInAction(formData: FormData) {
  await ensureAuthSchema();

  const email = readText(formData, "email").toLowerCase();
  const password = readText(formData, "password");

  if (!email || !password) {
    redirect(`/signin?error=${toErrorMessage("Email and password are required.", "Invalid credentials")}`);
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    redirect(`/signin?error=${toErrorMessage("Invalid email or password.", "Invalid credentials")}`);
  }

  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    redirect(`/signin?error=${toErrorMessage("Invalid email or password.", "Invalid credentials")}`);
  }

  await createSession(user.id);

  if (!user.role) {
    redirect("/onboarding");
  }

  redirect("/profile");
}

export async function selectRoleAction(formData: FormData) {
  await ensureAuthSchema();

  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin");
  }

  const roleRaw = readText(formData, "role").toUpperCase();
  const role = roleRaw === "TRAINEE" || roleRaw === "TRAINER" ? (roleRaw as UserRole) : null;

  if (!role) {
    redirect("/onboarding?error=Please%20select%20a%20valid%20role.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role },
  });

  redirect("/profile");
}

export async function updateProfileAction(formData: FormData) {
  await ensureAuthSchema();

  const user = await requireOnboardedUser();

  const name = readText(formData, "name");
  const bio = readText(formData, "bio");
  const avatarData = readText(formData, "avatarData");

  if (!name) {
    redirect("/settings?error=Name%20is%20required.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      bio,
      avatarData: avatarData || null,
    },
  });

  redirect("/settings?saved=1");
}

export async function createGroupAction(formData: FormData) {
  const user = await requireOnboardedUser();

  if (user.role !== "TRAINER") {
    redirect("/groups?error=Only%20trainers%20can%20create%20groups.");
  }

  const name = readText(formData, "name");
  const description = readText(formData, "description");

  if (!name) {
    redirect("/groups?error=Group%20name%20is%20required.");
  }

  await prisma.group.create({
    data: {
      name,
      description,
      trainerId: user.id,
    },
  });

  redirect("/groups?saved=group");
}

export async function requestJoinGroupAction(formData: FormData) {
  const user = await requireOnboardedUser();

  if (user.role !== "TRAINEE") {
    redirect("/search?error=Only%20trainees%20can%20join%20groups.");
  }

  const groupId = readText(formData, "groupId");

  if (!groupId) {
    redirect("/search?error=Invalid%20group.");
  }

  const [existingMembership, existingPending] = await Promise.all([
    prisma.groupMember.findUnique({ where: { userId_groupId: { userId: user.id, groupId } } }),
    prisma.groupJoinRequest.findFirst({
      where: {
        userId: user.id,
        groupId,
        status: JoinRequestStatus.PENDING,
      },
    }),
  ]);

  if (existingMembership || existingPending) {
    redirect("/search?error=Request%20already%20exists%20for%20this%20group.");
  }

  await prisma.groupJoinRequest.create({
    data: {
      userId: user.id,
      groupId,
    },
  });

  redirect("/search?saved=request");
}

export async function reviewJoinRequestAction(formData: FormData) {
  const user = await requireOnboardedUser();

  if (user.role !== "TRAINER") {
    redirect("/groups?error=Only%20trainers%20can%20review%20requests.");
  }

  const requestId = readText(formData, "requestId");
  const decision = readText(formData, "decision").toUpperCase();

  if (!requestId || (decision !== "ACCEPT" && decision !== "DECLINE")) {
    redirect("/groups?error=Invalid%20request%20action.");
  }

  const request = await prisma.groupJoinRequest.findUnique({
    where: { id: requestId },
    include: { group: true },
  });

  if (!request || request.group.trainerId !== user.id || request.status !== JoinRequestStatus.PENDING) {
    redirect("/groups?error=Request%20not%20available.");
  }

  if (decision === "ACCEPT") {
    await prisma.$transaction([
      prisma.groupJoinRequest.update({
        where: { id: request.id },
        data: {
          status: JoinRequestStatus.ACCEPTED,
          reviewedAt: new Date(),
        },
      }),
      prisma.groupMember.upsert({
        where: {
          userId_groupId: {
            userId: request.userId,
            groupId: request.groupId,
          },
        },
        update: {},
        create: {
          userId: request.userId,
          groupId: request.groupId,
        },
      }),
    ]);
  } else {
    await prisma.groupJoinRequest.update({
      where: { id: request.id },
      data: {
        status: JoinRequestStatus.DECLINED,
        reviewedAt: new Date(),
      },
    });
  }

  redirect("/groups?saved=request");
}

function parseExercisesFromForm(formData: FormData) {
  const names = formData.getAll("exerciseName").map((value) => (typeof value === "string" ? value.trim() : ""));
  const setNumbers = formData
    .getAll("exerciseSetNumber")
    .map((value) => (typeof value === "string" ? value.trim() : ""));
  const setsValues = formData.getAll("exerciseSets").map((value) => (typeof value === "string" ? value.trim() : ""));
  const repsValues = formData.getAll("exerciseReps").map((value) => (typeof value === "string" ? value.trim() : ""));
  const loadValues = formData.getAll("exerciseLoad").map((value) => (typeof value === "string" ? value.trim() : ""));
  const targetRpeValues = formData
    .getAll("exerciseTargetRpe")
    .map((value) => (typeof value === "string" ? value.trim() : ""));
  const optionalIntensityValues = formData
    .getAll("exerciseOptionalIntensity")
    .map((value) => (typeof value === "string" ? value.trim() : ""));

  if (
    !names.length ||
    names.length !== setNumbers.length ||
    names.length !== setsValues.length ||
    names.length !== repsValues.length ||
    names.length !== loadValues.length ||
    names.length !== targetRpeValues.length ||
    names.length !== optionalIntensityValues.length
  ) {
    return [];
  }

  let sortOrder = 0;
  const result: Array<{
    name: string;
    setNumber: number;
    sets: number;
    reps: number;
    rpe: number;
    load: number;
    explicitIntensity: number | null;
    intensity: number;
    volume: number;
    sortOrder: number;
  }> = [];

  for (let index = 0; index < names.length; index += 1) {
    const name = names[index];
    const setNumberRaw = setNumbers[index];
    const setsRaw = setsValues[index];
    const repsRaw = repsValues[index];
    const loadRaw = loadValues[index];
    const targetRpeRaw = targetRpeValues[index];
    const explicitIntensityRaw = optionalIntensityValues[index];
    const setNumber = Number.parseInt(setNumberRaw ?? "", 10);
    const sets = Number.parseInt(setsRaw ?? "", 10);
    const reps = Number.parseInt(repsRaw ?? "", 10);
    const load = Number.parseFloat(loadRaw ?? "");
    const targetRpe = Number.parseFloat(targetRpeRaw ?? "");
    const explicitIntensity = explicitIntensityRaw ? Number.parseFloat(explicitIntensityRaw) : null;

    if (
      !name ||
      Number.isNaN(setNumber) ||
      Number.isNaN(sets) ||
      Number.isNaN(reps) ||
      Number.isNaN(load) ||
      Number.isNaN(targetRpe) ||
      (explicitIntensity !== null && Number.isNaN(explicitIntensity)) ||
      setNumber < 1 ||
      sets < 1 ||
      reps < 1 ||
      load <= 0
    ) {
      return [];
    }

    const initialIntensity = explicitIntensity ?? lookupIntensityPercent(reps, targetRpe) ?? 0;
    const roundedLoad = roundToIncrement(load, 2.5);

    result.push({
      name,
      setNumber,
      sets,
      reps,
      rpe: targetRpe,
      load: roundedLoad,
      explicitIntensity,
      intensity: initialIntensity,
      volume: calculateVolume(roundedLoad, reps),
      sortOrder,
    });

    sortOrder += 1;
  }

  return result;
}

export async function createWorkoutAction(formData: FormData) {
  const user = await requireOnboardedUser();

  if (user.role !== "TRAINER") {
    redirect("/groups?error=Only%20trainers%20can%20create%20workouts.");
  }

  const groupId = readText(formData, "groupId");
  const traineeId = readText(formData, "traineeId");
  const title = readText(formData, "title");
  const dayLabel = readText(formData, "dayLabel");
  const deadlineRaw = readText(formData, "deadline");
  const deadline = new Date(deadlineRaw);
  const parsedExercises = parseExercisesFromForm(formData);

  if (!groupId || !traineeId || !title || !dayLabel || Number.isNaN(deadline.getTime())) {
    redirect("/groups?error=Invalid%20workout%20inputs.");
  }

  if (!parsedExercises.length) {
    redirect("/groups?error=Provide%20valid%20exercise%20rows%20with%20name,%20sets,%20reps,%20load,%20targetRpe.");
  }

  const membership = await prisma.groupMember.findUnique({
    where: {
      userId_groupId: {
        userId: traineeId,
        groupId,
      },
    },
    include: {
      group: true,
      user: true,
    },
  });

  if (!membership || membership.group.trainerId !== user.id || membership.user.role !== "TRAINEE") {
    redirect("/groups?error=Trainee%20is%20not%20in%20your%20group.");
  }

  await prisma.workout.create({
    data: {
      title,
      dayLabel,
      deadline,
      groupId,
      traineeId,
      trainerId: user.id,
      exercises: {
        create: parsedExercises,
      },
    },
  });

  redirect("/groups?saved=workout");
}

export async function completeExerciseSetAction(formData: FormData) {
  const user = await requireOnboardedUser();

  if (user.role !== "TRAINEE") {
    redirect("/profile?error=Only%20trainees%20can%20update%20exercise%20status.");
  }

  const exerciseId = readText(formData, "exerciseId");
  const actualRpe = Number.parseFloat(readText(formData, "actualRpe"));

  const exercise = await prisma.workoutExercise.findUnique({
    where: { id: exerciseId },
    include: { workout: true },
  });

  if (!exercise || exercise.workout.traineeId !== user.id || exercise.workout.isArchived) {
    redirect("/profile?error=Exercise%20not%20available.");
  }

  const completedReps = exercise.reps;
  const loadUsed = exercise.load;

  if (Number.isNaN(actualRpe) || completedReps < 1 || loadUsed <= 0) {
    redirect("/profile?error=Provide%20a%20valid%20actual%20RPE.");
  }

  const actualIntensity = lookupIntensityPercent(completedReps, actualRpe);

  if (!actualIntensity) {
    redirect("/profile?error=Could%20not%20resolve%20intensity%20from%20RPE%20chart.");
  }

  const e1rm = estimateE1rm(loadUsed, actualIntensity);

  if (!e1rm) {
    redirect("/profile?error=Failed%20to%20estimate%20daily%201RM.");
  }

  const roundedLoadUsed = roundToIncrement(loadUsed, 2.5);
  const updates = [
    prisma.workoutExercise.update({
      where: { id: exercise.id },
      data: {
        actualRpe,
        completedReps,
        intensity: actualIntensity,
        load: roundedLoadUsed,
        volume: calculateVolume(roundedLoadUsed, completedReps),
        isCompleted: true,
        completedAt: new Date(),
        completedByUserId: user.id,
      },
    }),
  ];

  const laterSets = await prisma.workoutExercise.findMany({
    where: {
      workoutId: exercise.workoutId,
      name: exercise.name,
      sortOrder: { gt: exercise.sortOrder },
      isCompleted: false,
    },
    orderBy: { sortOrder: "asc" },
  });

  for (const set of laterSets) {
    const targetIntensity = set.explicitIntensity ?? lookupIntensityPercent(set.reps, set.rpe);

    if (!targetIntensity) {
      continue;
    }

    const nextLoad = roundToIncrement(e1rm * (targetIntensity / 100), 2.5);

    updates.push(
      prisma.workoutExercise.update({
        where: { id: set.id },
        data: {
          load: nextLoad,
          intensity: targetIntensity,
          volume: calculateVolume(nextLoad, set.reps),
        },
      }),
    );
  }

  await prisma.$transaction(updates);
  await syncWorkoutCompletion(exercise.workoutId, user.id);

  redirect("/profile?saved=set");
}

export async function resetExerciseSetAction(formData: FormData) {
  const user = await requireOnboardedUser();

  if (user.role !== "TRAINEE") {
    redirect("/profile?error=Only%20trainees%20can%20update%20exercise%20status.");
  }

  const exerciseId = readText(formData, "exerciseId");

  const exercise = await prisma.workoutExercise.findUnique({
    where: { id: exerciseId },
    include: { workout: true },
  });

  if (!exercise || exercise.workout.traineeId !== user.id || exercise.workout.isArchived) {
    redirect("/profile?error=Exercise%20not%20available.");
  }

  await prisma.workoutExercise.update({
    where: { id: exercise.id },
    data: {
      actualRpe: null,
      completedReps: null,
      isCompleted: false,
      completedAt: null,
      completedByUserId: null,
    },
  });

  await syncWorkoutCompletion(exercise.workoutId, user.id);

  redirect("/profile");
}

export async function logoutAction() {
  await destroySession();
  redirect("/signin");
}
