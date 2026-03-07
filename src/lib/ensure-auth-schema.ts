import { prisma } from "@/lib/prisma";

declare global {
  var __workouterAuthSchemaReady: Promise<void> | undefined;
}

async function ensureAuthSchemaInternal() {
  await prisma.$executeRawUnsafe(`
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'UserRole' AND n.nspname = 'public') THEN
    CREATE TYPE "public"."UserRole" AS ENUM ('TRAINEE', 'TRAINER');
  END IF;
END
$$;
  `);

  await prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "public"."User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "public"."UserRole",
  "bio" TEXT NOT NULL DEFAULT '',
  "avatarData" TEXT,
  "points" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
  `);

  await prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "public"."Session" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
  `);

  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "public"."User"("email");',
  );
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX IF NOT EXISTS "Session_tokenHash_key" ON "public"."Session"("tokenHash");',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "public"."Session"("userId");',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "public"."Session"("expiresAt");',
  );

  await prisma.$executeRawUnsafe(`
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'Session_userId_fkey'
      AND t.relname = 'Session'
      AND n.nspname = 'public'
  ) THEN
    ALTER TABLE "public"."Session"
      ADD CONSTRAINT "Session_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
  `);
}

export async function ensureAuthSchema() {
  if (!globalThis.__workouterAuthSchemaReady) {
    globalThis.__workouterAuthSchemaReady = ensureAuthSchemaInternal().catch((error) => {
      globalThis.__workouterAuthSchemaReady = undefined;
      throw error;
    });
  }

  return globalThis.__workouterAuthSchemaReady;
}
