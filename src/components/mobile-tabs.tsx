"use client";

import { useSyncExternalStore } from "react";
import { UserRole } from "@prisma/client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

function getMobileItems(role: UserRole | null): NavItem[] {
  const groupsItem: NavItem = {
    href: "/groups",
    label: "Groups",
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 8H20M4 12H20M4 16H14" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  };

  const core: NavItem[] = [
    {
      href: "/profile",
      label: "Profile",
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M5 20C5 16.7 8 14 12 14C16 14 19 16.7 19 20" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      ),
    },
    role === "TRAINER"
      ? groupsItem
      : {
          href: "/search",
          label: "Search",
          icon: (
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M16 16L21 21" fill="none" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          ),
        },
    {
      href: "/leaderboard",
      label: "Leaderboard",
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M4 20V10M12 20V6M20 20V13" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      ),
    },
    {
      href: role === "TRAINER" ? "/search" : "/groups",
      label: role === "TRAINER" ? "Search" : "Groups",
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          {role === "TRAINER" ? (
            <>
              <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M16 16L21 21" fill="none" stroke="currentColor" strokeWidth="1.8" />
            </>
          ) : (
            <path d="M4 8H20M4 12H20M4 16H14" fill="none" stroke="currentColor" strokeWidth="1.8" />
          )}
        </svg>
      ),
    },
    {
      href: "/settings",
      label: "Settings",
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M19 12A7 7 0 0 0 19 11L21 9L19 5L16 6A7 7 0 0 0 14 5L13 2H11L10 5A7 7 0 0 0 8 6L5 5L3 9L5 11A7 7 0 0 0 5 13L3 15L5 19L8 18A7 7 0 0 0 10 19L11 22H13L14 19A7 7 0 0 0 16 18L19 19L21 15L19 13A7 7 0 0 0 19 12Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </svg>
      ),
    },
  ];

  return core;
}

type MobileTabsProps = {
  role: UserRole | null;
};

export function MobileTabs({ role }: MobileTabsProps) {
  const pathname = usePathname();
  const items = getMobileItems(role);
  const hydratedPathname = useSyncExternalStore(
    () => () => {},
    () => pathname,
    () => null,
  );

  return (
    <nav aria-label="Mobile navigation" className="mobile-tabs" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((item) => {
        const isActive = hydratedPathname === item.href;

        return (
          <Link className={`mobile-tab-item ${isActive ? "active" : ""}`} href={item.href} key={item.href}>
            <span className="mobile-tab-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
