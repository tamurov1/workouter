import { redirect } from "next/navigation";
import { selectRoleAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";

type OnboardingPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const user = await requireUser();

  if (user.role) {
    redirect("/profile");
  }

  const params = await searchParams;

  return (
    <main className="screen-shell">
      <section className="panel role-panel">
        <p className="eyebrow">Workouter Setup</p>
        <h1 className="panel-title">Who are you?</h1>
        <p className="panel-copy">Choose your role to unlock your app permissions and features.</p>

        {params.error ? <p className="status-error">{decodeURIComponent(params.error)}</p> : null}

        <form action={selectRoleAction} className="role-grid">
          <button className="role-card" name="role" type="submit" value="TRAINEE">
            <span className="role-name">Trainee</span>
            <span className="role-note">Track workouts, progress, and stats.</span>
          </button>

          <button className="role-card" name="role" type="submit" value="TRAINER">
            <span className="role-name">Trainer</span>
            <span className="role-note">Guide trainees and monitor outcomes.</span>
          </button>
        </form>
      </section>
    </main>
  );
}
