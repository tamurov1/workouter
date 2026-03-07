import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type DbInfoRow = {
  current_database: string;
  current_schema: string;
  search_path: string;
};

type RegclassRow = {
  user_table: string | null;
  user_lower_table: string | null;
};

type TableRow = {
  table_name: string;
};

function safePostgresUrlDetails(urlValue: string | undefined) {
  if (!urlValue) {
    return null;
  }

  try {
    const parsed = new URL(urlValue);
    return {
      protocol: parsed.protocol,
      host: parsed.hostname,
      port: parsed.port || "default",
      database: parsed.pathname.replace(/^\//, "") || null,
      sslmode: parsed.searchParams.get("sslmode"),
    };
  } catch {
    return { invalid: true };
  }
}

export async function GET() {
  try {
    const dbInfo = await prisma.$queryRaw<DbInfoRow[]>`
      select
        current_database() as current_database,
        current_schema() as current_schema,
        current_setting('search_path') as search_path
    `;

    const userRegclass = await prisma.$queryRaw<RegclassRow[]>`
      select
        to_regclass('public."User"')::text as user_table,
        to_regclass('public.user')::text as user_lower_table
    `;

    const publicTables = await prisma.$queryRaw<TableRow[]>`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
      order by table_name
    `;

    return NextResponse.json({
      ok: true,
      prismaClientVersion: "6.16.2",
      env: {
        hasPostgresUrl: Boolean(process.env.POSTGRES_URL),
        hasSessionSecret: Boolean(process.env.SESSION_SECRET || process.env.SUPABASE_SECRET_KEY),
        postgresUrlDetails: safePostgresUrlDetails(process.env.POSTGRES_URL),
      },
      dbInfo: dbInfo[0] ?? null,
      userTableLookup: userRegclass[0] ?? null,
      publicTables: publicTables.map((row) => row.table_name),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        ok: false,
        error: message,
        env: {
          hasPostgresUrl: Boolean(process.env.POSTGRES_URL),
          postgresUrlDetails: safePostgresUrlDetails(process.env.POSTGRES_URL),
        },
      },
      { status: 500 },
    );
  }
}
