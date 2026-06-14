import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/auth";
import {
  CompassIcon,
  DocIcon,
  GridIcon,
  InboxIcon,
  LedgerIcon,
  LogoMark,
  PlusIcon,
  UserIcon,
} from "@/components/icons";
import styles from "@/app/app.module.css";

type NavItem = {
  key: string;
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  badge?: number;
};

/**
 * Authenticated workspace chrome. The navigation is role-aware: candidates get
 * their ledger and CV; recruiters get jobs and the pipeline. `active` highlights
 * the current section and `requestCount` badges a candidate's open requests.
 */
export default function AppShell({
  user,
  active,
  requestCount = 0,
  children,
}: {
  user: SessionUser;
  active: string;
  requestCount?: number;
  children: React.ReactNode;
}) {
  const home = user.role === "recruiter" ? "/employer" : "/dashboard";
  const nav_items: NavItem[] =
    user.role === "recruiter"
      ? [
          { key: "overview", href: "/employer", label: "Overview", icon: GridIcon },
          { key: "new", href: "/employer/jobs/new", label: "Post a role", icon: PlusIcon },
        ]
      : [
          { key: "overview", href: "/dashboard", label: "Overview", icon: GridIcon },
          { key: "ledger", href: "/ledger", label: "Living Ledger", icon: LedgerIcon },
          { key: "cv", href: "/cv", label: "Your CV", icon: DocIcon },
          { key: "discover", href: "/discover", label: "Discover roles", icon: CompassIcon },
          {
            key: "requests",
            href: "/requests",
            label: "Requests",
            icon: InboxIcon,
            badge: requestCount,
          },
          { key: "profile", href: "/profile", label: "Profile", icon: UserIcon },
        ];

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href={home} className={styles.brand}>
          <LogoMark className={styles.brandMark} />
          Career&nbsp;OS
        </Link>

        <nav>
          <ul className={styles.navList}>
            {nav_items.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className={`${styles.navItem} ${
                    active === item.key ? styles.navItemActive : ""
                  }`}
                  aria-current={active === item.key ? "page" : undefined}
                >
                  <item.icon className={styles.navIcon} />
                  {item.label}
                  {item.badge ? <span className={styles.navBadge}>{item.badge}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.sidebarFoot}>
          <div className={styles.userCard}>
            <div className={styles.userName}>{user.name}</div>
            <div className={styles.userMeta}>
              {user.role === "recruiter" ? (user.company ?? "Recruiter") : user.email}
            </div>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="btn btn-quiet">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className={styles.content}>{children}</main>
    </div>
  );
}
