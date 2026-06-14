import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/auth";
import { LogoMark } from "@/components/icons";
import MobileNav from "@/components/MobileNav";
import { getHomeHref, getNavItems } from "@/components/navItems";
import styles from "@/app/app.module.css";

/**
 * Authenticated workspace chrome. The navigation is role-aware: candidates get
 * their ledger and CV; recruiters get jobs and the pipeline. `active` highlights
 * the current section and `requestCount` badges a candidate's open requests. The
 * desktop sidebar collapses into a hamburger drawer on small screens.
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
  const home = getHomeHref(user.role);
  const nav_items = getNavItems(user.role, requestCount);

  return (
    <div className={styles.shell}>
      <MobileNav
        role={user.role}
        active={active}
        requestCount={requestCount}
        home={home}
      />

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
                  {item.badge ? (
                    <span className={styles.navBadge}>{item.badge}</span>
                  ) : null}
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
