import { randomBytes, createHash } from "crypto";
import { compare, hash } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "workouter_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function requireSessionSecret() {
  const secret = process.env.SESSION_SECRET ?? process.env.SUPABASE_SECRET_KEY;

  if (!secret) {
    throw new Error("SESSION_SECRET (or SUPABASE_SECRET_KEY fallback) is not configured");
  }

  return secret;
}

function hashToken(token: string) {
  const secret = requireSessionSecret();
  return createHash("sha256").update(`${token}.${secret}`).digest("hex");
}

export async function hashPassword(password: string) {
  return hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return;
  }

  await prisma.session.deleteMany({
    where: { tokenHash: hashToken(token) },
  });

  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session) {
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin");
  }

  return user;
}

export async function redirectAfterLogin() {
  const user = await requireUser();

  if (!user.role) {
    redirect("/onboarding");
  }

  redirect("/profile");
}
