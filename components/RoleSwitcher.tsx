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
    ? "rounded-full bg-[#B8860B] px-3 py-1.5 text-sm font-semibold text-[#0D1B2A]"
    : "rounded-full bg-white px-3 py-1.5 text-sm font-medium text-[#7A7060] transition hover:bg-[#FAF7F2] hover:text-[#0D1B2A]";
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
    <div className="flex items-center gap-2 rounded-full border border-[#E5E0D8] bg-[#FAF7F2] p-1">
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
