import Link from "next/link";
import { redirect } from "next/navigation";
import { signInAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";

type SignInPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect(user.role ? "/profile" : "/onboarding");
  }

  const params = await searchParams;

  return (
    <main className="screen-shell">
      <section className="panel auth-panel">
        <p className="eyebrow">Workouter</p>
        <h1 className="panel-title">Sign In</h1>
        <p className="panel-copy">Continue building your training profile.</p>

        {params.error ? <p className="status-error">{decodeURIComponent(params.error)}</p> : null}

        <form action={signInAction} className="form-stack">
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input className="field-input" id="email" name="email" type="email" required />

          <label className="field-label" htmlFor="password">
            Password
          </label>
          <input className="field-input" id="password" name="password" type="password" required />

          <button className="primary-button" type="submit">
            Log In
          </button>
        </form>

        <p className="form-footer">
          New here? <Link href="/signup">Create account</Link>
        </p>
      </section>
    </main>
  );
}
