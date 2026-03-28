import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";
import { MobileTabs } from "@/components/mobile-tabs";

type DashboardShellProps = {
  children: React.ReactNode;
};

export async function DashboardShell({ children }: DashboardShellProps) {
  const user = await getCurrentUser();
  const navItems = [
    { href: "/profile", label: "Profile" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/groups", label: "Groups" },
    { href: "/search", label: "Search" },
    { href: "/archive", label: "Archive" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <main className="screen-shell app-shell">
      <aside className="panel side-rail">
        <div className="side-rail-brand">
          <p className="eyebrow">Workouter</p>
          <h1 className="side-rail-title">Dashboard</h1>
          <p className="panel-copy">
            {user?.role === "TRAINER" ? "Manage trainees, workouts, and groups." : "Check workouts, progress, and profile."}
          </p>
        </div>

        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link key={item.href} className="side-nav-item" href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <form action={logoutAction} className="mt-auto">
          <button className="secondary-button w-full" type="submit">
            Log Out
          </button>
        </form>
      </aside>

      <section className="content-stack">{children}</section>
      <MobileTabs role={user?.role ?? null} />
    </main>
  );
}
