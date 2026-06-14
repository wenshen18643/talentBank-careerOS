import type { ComponentType, SVGProps } from "react";
import {
  CompassIcon,
  DocIcon,
  GridIcon,
  InboxIcon,
  LedgerIcon,
  PlusIcon,
  UserIcon,
} from "@/components/icons";

/**
 * Shared, role-aware navigation model used by both the desktop sidebar and the
 * mobile drawer, so the two surfaces can never drift out of sync.
 */

export type NavItem = {
  key: string;
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  badge?: number;
};

export function getHomeHref(role: string): string {
  return role === "recruiter" ? "/employer" : "/dashboard";
}

export function getNavItems(role: string, requestCount = 0): NavItem[] {
  if (role === "recruiter") {
    return [
      { key: "overview", href: "/employer", label: "Overview", icon: GridIcon },
      { key: "new", href: "/employer/jobs/new", label: "Post a role", icon: PlusIcon },
    ];
  }
  return [
    { key: "overview", href: "/dashboard", label: "Overview", icon: GridIcon },
    { key: "ledger", href: "/ledger", label: "Living Ledger", icon: LedgerIcon },
    { key: "cv", href: "/cv", label: "Your CV", icon: DocIcon },
    { key: "discover", href: "/discover", label: "Discover roles", icon: CompassIcon },
    { key: "requests", href: "/requests", label: "Requests", icon: InboxIcon, badge: requestCount },
    { key: "profile", href: "/profile", label: "Profile", icon: UserIcon },
  ];
}
