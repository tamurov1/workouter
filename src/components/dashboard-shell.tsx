import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";
import { MobileTabs } from "@/components/mobile-tabs";

type DashboardShellProps = {
  children: React.ReactNode;
};

const NAV_ITEMS = [
  { href: "/search", label: "Search" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
];

export async function DashboardShell({ children }: DashboardShellProps) {
  const user = await getCurrentUser();

  return (
    <main className="screen-shell app-shell">
      <aside className="panel side-rail">
        <p className="eyebrow">Workouter</p>
        <nav className="side-nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
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
