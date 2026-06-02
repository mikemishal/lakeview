"use client";

import Link from "next/link";

type RoleSwitcherProps = {
  currentSection?: "owner" | "provider" | "onboarding";
  showOwner: boolean;
  showProvider: boolean;
  showOnboarding: boolean;
};

function buttonClass(active: boolean): string {
  return active
    ? "rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
    : "rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100";
}

export default function RoleSwitcher({
  currentSection,
  showOwner,
  showProvider,
  showOnboarding,
}: RoleSwitcherProps) {
  const hasRoleSwitch = showOwner || showProvider;

  if (!hasRoleSwitch && !showOnboarding) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
      {showOwner ? (
        <Link href="/owner" className={buttonClass(currentSection === "owner")}>Owner</Link>
      ) : null}
      {showProvider ? (
        <Link href="/provider" className={buttonClass(currentSection === "provider")}>Provider</Link>
      ) : null}
      {!hasRoleSwitch && showOnboarding ? (
        <Link
          href="/onboarding"
          className={buttonClass(currentSection === "onboarding")}
        >
          Onboarding
        </Link>
      ) : null}
    </div>
  );
}
