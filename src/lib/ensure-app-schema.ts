import { prisma } from "@/lib/prisma";

declare global {
  var __workouterAppSchemaReady: Promise<void> | undefined;
}

async function ensureAppSchemaInternal() {
  await prisma.$executeRawUnsafe(`
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'JoinRequestStatus' AND n.nspname = 'public') THEN
    CREATE TYPE "public"."JoinRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');
  END IF;
END
$$;
  `);

  await prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "public"."Group" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "trainerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);
  `);

  await prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "public"."GroupMember" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);
  `);

  await prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "public"."GroupJoinRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "status" "public"."JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GroupJoinRequest_pkey" PRIMARY KEY ("id")
);
  `);

  await prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "public"."Workout" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "dayLabel" TEXT NOT NULL,
  "deadline" TIMESTAMP(3) NOT NULL,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "groupId" TEXT NOT NULL,
  "traineeId" TEXT NOT NULL,
  "trainerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Workout_pkey" PRIMARY KEY ("id")
);
  `);

  await prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "public"."WorkoutExercise" (
  "id" TEXT NOT NULL,
  "workoutId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "setNumber" INTEGER NOT NULL DEFAULT 1,
  "sets" INTEGER NOT NULL,
  "reps" INTEGER NOT NULL,
  "rpe" DOUBLE PRECISION NOT NULL,
  "load" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "explicitIntensity" DOUBLE PRECISION,
  "actualRpe" DOUBLE PRECISION,
  "completedReps" INTEGER,
  "intensity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isCompleted" BOOLEAN NOT NULL DEFAULT false,
  "volume" INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "completedByUserId" TEXT,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "WorkoutExercise_pkey" PRIMARY KEY ("id")
);
  `);

  await prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "public"."WorkoutCompletion" (
  "id" TEXT NOT NULL,
  "workoutId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkoutCompletion_pkey" PRIMARY KEY ("id")
);
  `);

  await prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "public"."WorkoutTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "dayLabel" TEXT NOT NULL,
  "trainerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkoutTemplate_pkey" PRIMARY KEY ("id")
);
  `);

  await prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "public"."WorkoutTemplateExercise" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "setNumber" INTEGER NOT NULL DEFAULT 1,
  "sets" INTEGER NOT NULL,
  "reps" INTEGER NOT NULL,
  "rpe" DOUBLE PRECISION NOT NULL,
  "load" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "explicitIntensity" DOUBLE PRECISION,
  "intensity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "volume" INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  CONSTRAINT "WorkoutTemplateExercise_pkey" PRIMARY KEY ("id")
);
  `);

  const indexes = [
    'CREATE INDEX IF NOT EXISTS "Group_trainerId_idx" ON "public"."Group"("trainerId");',
    'CREATE INDEX IF NOT EXISTS "GroupMember_groupId_idx" ON "public"."GroupMember"("groupId");',
    'CREATE UNIQUE INDEX IF NOT EXISTS "GroupMember_userId_groupId_key" ON "public"."GroupMember"("userId", "groupId");',
    'CREATE INDEX IF NOT EXISTS "GroupJoinRequest_groupId_status_idx" ON "public"."GroupJoinRequest"("groupId", "status");',
    'CREATE INDEX IF NOT EXISTS "GroupJoinRequest_userId_idx" ON "public"."GroupJoinRequest"("userId");',
    'CREATE INDEX IF NOT EXISTS "Workout_groupId_idx" ON "public"."Workout"("groupId");',
    'CREATE INDEX IF NOT EXISTS "Workout_traineeId_deadline_idx" ON "public"."Workout"("traineeId", "deadline");',
    'CREATE INDEX IF NOT EXISTS "Workout_isArchived_deadline_idx" ON "public"."Workout"("isArchived", "deadline");',
    'CREATE INDEX IF NOT EXISTS "WorkoutExercise_workoutId_sortOrder_idx" ON "public"."WorkoutExercise"("workoutId", "sortOrder");',
    'CREATE INDEX IF NOT EXISTS "WorkoutExercise_workoutId_name_sortOrder_idx" ON "public"."WorkoutExercise"("workoutId", "name", "sortOrder");',
    'CREATE INDEX IF NOT EXISTS "WorkoutCompletion_userId_completedAt_idx" ON "public"."WorkoutCompletion"("userId", "completedAt");',
    'CREATE UNIQUE INDEX IF NOT EXISTS "WorkoutCompletion_workoutId_userId_key" ON "public"."WorkoutCompletion"("workoutId", "userId");',
    'CREATE INDEX IF NOT EXISTS "WorkoutTemplate_trainerId_createdAt_idx" ON "public"."WorkoutTemplate"("trainerId", "createdAt");',
    'CREATE INDEX IF NOT EXISTS "WorkoutTemplateExercise_templateId_sortOrder_idx" ON "public"."WorkoutTemplateExercise"("templateId", "sortOrder");',
    'CREATE INDEX IF NOT EXISTS "WorkoutTemplateExercise_templateId_name_sortOrder_idx" ON "public"."WorkoutTemplateExercise"("templateId", "name", "sortOrder");',
  ];

  for (const sql of indexes) {
    await prisma.$executeRawUnsafe(sql);
  }

  const constraints = [
    {
      name: "Group_trainerId_fkey",
      table: "Group",
      sql: `ALTER TABLE "public"."Group" ADD CONSTRAINT "Group_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
    },
    {
      name: "GroupMember_userId_fkey",
      table: "GroupMember",
      sql: `ALTER TABLE "public"."GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
    },
    {
      name: "GroupMember_groupId_fkey",
      table: "GroupMember",
      sql: `ALTER TABLE "public"."GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
    },
    {
      name: "GroupJoinRequest_userId_fkey",
      table: "GroupJoinRequest",
      sql: `ALTER TABLE "public"."GroupJoinRequest" ADD CONSTRAINT "GroupJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
    },
    {
      name: "GroupJoinRequest_groupId_fkey",
      table: "GroupJoinRequest",
      sql: `ALTER TABLE "public"."GroupJoinRequest" ADD CONSTRAINT "GroupJoinRequest_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
    },
    {
      name: "Workout_groupId_fkey",
      table: "Workout",
      sql: `ALTER TABLE "public"."Workout" ADD CONSTRAINT "Workout_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
    },
    {
      name: "Workout_traineeId_fkey",
      table: "Workout",
      sql: `ALTER TABLE "public"."Workout" ADD CONSTRAINT "Workout_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
    },
    {
      name: "Workout_trainerId_fkey",
      table: "Workout",
      sql: `ALTER TABLE "public"."Workout" ADD CONSTRAINT "Workout_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
    },
    {
      name: "WorkoutExercise_workoutId_fkey",
      table: "WorkoutExercise",
      sql: `ALTER TABLE "public"."WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "public"."Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
    },
    {
      name: "WorkoutExercise_completedByUserId_fkey",
      table: "WorkoutExercise",
      sql: `ALTER TABLE "public"."WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;`,
    },
    {
      name: "WorkoutCompletion_workoutId_fkey",
      table: "WorkoutCompletion",
      sql: `ALTER TABLE "public"."WorkoutCompletion" ADD CONSTRAINT "WorkoutCompletion_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "public"."Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
    },
    {
      name: "WorkoutCompletion_userId_fkey",
      table: "WorkoutCompletion",
      sql: `ALTER TABLE "public"."WorkoutCompletion" ADD CONSTRAINT "WorkoutCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
    },
    {
      name: "WorkoutTemplate_trainerId_fkey",
      table: "WorkoutTemplate",
      sql: `ALTER TABLE "public"."WorkoutTemplate" ADD CONSTRAINT "WorkoutTemplate_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
    },
    {
      name: "WorkoutTemplateExercise_templateId_fkey",
      table: "WorkoutTemplateExercise",
      sql: `ALTER TABLE "public"."WorkoutTemplateExercise" ADD CONSTRAINT "WorkoutTemplateExercise_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."WorkoutTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
    },
  ];

  for (const constraint of constraints) {
    await prisma.$executeRawUnsafe(`
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = '${constraint.name}'
      AND t.relname = '${constraint.table}'
      AND n.nspname = 'public'
  ) THEN
    ${constraint.sql}
  END IF;
END
$$;
    `);
  }
}

export async function ensureAppSchema() {
  if (!globalThis.__workouterAppSchemaReady) {
    globalThis.__workouterAppSchemaReady = ensureAppSchemaInternal().catch((error) => {
      globalThis.__workouterAppSchemaReady = undefined;
      throw error;
    });
  }

  return globalThis.__workouterAppSchemaReady;
}
