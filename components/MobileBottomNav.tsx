"use client";

import Link from "next/link";

type OwnerTab = "overview" | "calendar" | "jobs" | "properties" | "providers";
type ProviderTab = "overview" | "queue" | "calendar" | "list";

type MobileBottomNavProps =
  | {
      mode: "owner";
      activeTab: OwnerTab;
      showRoleSwitch?: boolean;
    }
  | {
      mode: "provider";
      activeTab: ProviderTab;
      showRoleSwitch?: boolean;
    };

function itemClass(active: boolean): string {
  return active
    ? "rounded-full bg-[#B8860B] px-3 py-2 text-xs font-semibold text-[#0D1B2A]"
    : "rounded-full px-3 py-2 text-xs font-medium text-[#7A7060]";
}

export default function MobileBottomNav(props: MobileBottomNavProps) {
  if (props.mode === "owner") {
    const items = [
      { label: "Dashboard", href: "/owner?tab=overview", active: props.activeTab === "overview" },
      { label: "Calendar", href: "/owner?tab=calendar", active: props.activeTab === "calendar" },
      { label: "Jobs", href: "/owner?tab=jobs", active: props.activeTab === "jobs" },
      { label: "Properties", href: "/owner?tab=properties", active: props.activeTab === "properties" },
      {
        label: "My Team",
        href: "/owner?tab=providers",
        active: props.activeTab === "providers",
      },
    ] as const;

    return (
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5E0D8] bg-white/95 px-2 py-2 shadow-[0_-6px_20px_rgba(13,27,42,0.08)] md:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-1 overflow-x-auto">
          {items.map((item) => (
            <Link key={item.label} href={item.href} className={itemClass(item.active)}>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    );
  }

  const items = [
    { label: "Dashboard", href: "/provider?tab=overview", active: props.activeTab === "overview" },
    { label: "Jobs", href: "/provider?tab=queue", active: props.activeTab === "queue" || props.activeTab === "list" },
    { label: "Calendar", href: "/provider?tab=calendar", active: props.activeTab === "calendar" },
    { label: "Create Job", href: "/provider?tab=queue", active: false },
    {
      label: "Add Provider",
      href: props.showRoleSwitch ? "/owner?tab=providers" : "/onboarding",
      active: false,
    },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5E0D8] bg-white/95 px-2 py-2 shadow-[0_-6px_20px_rgba(13,27,42,0.08)] md:hidden">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-1 overflow-x-auto">
        {items.map((item) => (
          <Link key={item.label} href={item.href} className={itemClass(item.active)}>
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
