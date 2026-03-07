import Link from "next/link";
import { redirect } from "next/navigation";
import { signUpAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";

type SignUpPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect(user.role ? "/profile" : "/onboarding");
  }

  const params = await searchParams;

  return (
    <main className="screen-shell">
      <section className="panel auth-panel">
        <p className="eyebrow">Workouter</p>
        <h1 className="panel-title">Create Account</h1>
        <p className="panel-copy">Manual sign-up with name, email, and password.</p>

        {params.error ? <p className="status-error">{decodeURIComponent(params.error)}</p> : null}

        <form action={signUpAction} className="form-stack">
          <label className="field-label" htmlFor="name">
            Full Name
          </label>
          <input className="field-input" id="name" name="name" type="text" required />

          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input className="field-input" id="email" name="email" type="email" required />

          <label className="field-label" htmlFor="password">
            Password
          </label>
          <input
            className="field-input"
            id="password"
            minLength={8}
            name="password"
            type="password"
            required
          />

          <button className="primary-button" type="submit">
            Sign Up
          </button>
        </form>

        <p className="form-footer">
          Already have an account? <Link href="/signin">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
