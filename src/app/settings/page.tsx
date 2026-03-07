import { redirect } from "next/navigation";
import Link from "next/link";
import { updateProfileAction } from "@/app/actions";
import { AvatarInput } from "@/components/avatar-input";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireUser } from "@/lib/auth";

type SettingsPageProps = {
  searchParams: Promise<{ error?: string; saved?: string }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const user = await requireUser();

  if (!user.role) {
    redirect("/onboarding");
  }

  const params = await searchParams;

  return (
    <DashboardShell>
      <section className="panel profile-panel">
        <p className="eyebrow">Settings</p>
        <h1 className="panel-title">Profile Setup</h1>
        <p className="panel-copy">Manage your picture, display name, and bio.</p>

        {params.error ? <p className="status-error">{decodeURIComponent(params.error)}</p> : null}
        {params.saved ? <p className="status-success">Settings saved.</p> : null}

        <form action={updateProfileAction} className="form-stack">
          <AvatarInput initialValue={user.avatarData} />

          <label className="field-label" htmlFor="name">
            Name
          </label>
          <input className="field-input" defaultValue={user.name} id="name" name="name" required type="text" />

          <label className="field-label" htmlFor="bio">
            Bio
          </label>
          <textarea className="field-input min-h-28 resize-y" defaultValue={user.bio} id="bio" name="bio" />

          <button className="primary-button" type="submit">
            Save
          </button>
        </form>

        <div className="sub-block">
          <p className="field-label">More</p>
          <div className="settings-links">
            <Link className="secondary-button text-center" href="/groups">
              Groups
            </Link>
            <Link className="secondary-button text-center" href="/archive">
              Archive
            </Link>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
