# Workouter

Workouter is a Next.js app for workout users with:
- Manual sign up / sign in (name, email, password)
- Role onboarding after login (`trainee` or `trainer`)
- Group search and join-request flow
- Trainer-managed groups and workout assignment
- Workout tracking with exercise-level completion
- Workout archive records and points-based leaderboard

## Tech stack
- Next.js App Router (TypeScript)
- Prisma + SQLite (local development)
- Cookie-based sessions + hashed passwords (`bcryptjs`)

## Local setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment:
   - `.env` already contains:
     - `POSTGRES_URL` (required, Postgres connection string)
     - `POSTGRES_DATABASE`
     - `SESSION_SECRET` (or `SUPABASE_SECRET_KEY` fallback)
     - Optional `DATABASE_URL` mirror with same Postgres URL
3. Generate Prisma client:
   ```bash
   npx prisma generate
   ```
4. Initialize local DB schema (already included in `prisma/init.sql`):
   ```bash
   npx prisma db execute --file prisma/init.sql --schema prisma/schema.prisma
   ```
5. Start development server:
   ```bash
   npm run dev
   ```

## Routes
- `/signin`
- `/signup`
- `/onboarding`
- `/profile`
- `/search`
- `/groups`
- `/archive`
- `/leaderboard`
- `/settings`

## Production note (Vercel)
Prisma datasource is configured for Postgres. On Vercel, set `POSTGRES_URL` to your database connection string.
