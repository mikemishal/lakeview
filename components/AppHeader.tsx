"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

type AppHeaderProps = {
  currentSection?: "owner" | "provider" | "onboarding";
  showOwnerLink?: boolean;
  showProviderLink?: boolean;
  showProfilesLink?: boolean;
};

function navClass(isActive: boolean): string {
  return isActive
    ? "rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
    : "rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100";
}

export default function AppHeader({
  currentSection,
  showOwnerLink = false,
  showProviderLink = false,
  showProfilesLink = true,
}: AppHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white/95">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-700">
          Project Lakeview
        </Link>

        <nav className="flex flex-wrap items-center gap-2">
          {showOwnerLink ? (
            <Link href="/owner" className={navClass(currentSection === "owner")}>
              Owner Dashboard
            </Link>
          ) : null}
          {showProviderLink ? (
            <Link href="/provider" className={navClass(currentSection === "provider")}>
              Provider Dashboard
            </Link>
          ) : null}
          {showProfilesLink ? (
            <Link href="/onboarding" className={navClass(currentSection === "onboarding")}>
              Profiles
            </Link>
          ) : null}
        </nav>

        <UserButton />
      </div>
    </header>
  );
}
