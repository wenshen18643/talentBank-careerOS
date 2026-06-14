"use client";

import { useState } from "react";
import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { CloseIcon, LogoMark, MenuIcon } from "@/components/icons";
import { getNavItems } from "@/components/navItems";
import styles from "@/app/app.module.css";

/**
 * Mobile navigation: a sticky top bar with a hamburger that opens a drawer of
 * the same role-aware links the desktop sidebar shows. Hidden at desktop widths
 * via CSS. Tapping any link closes the drawer.
 */
export default function MobileNav({
  role,
  active,
  requestCount,
  home,
}: {
  role: string;
  active: string;
  requestCount: number;
  home: string;
}) {
  const [open, setOpen] = useState(false);
  const nav_items = getNavItems(role, requestCount);

  return (
    <header className={styles.mobileBar}>
      <Link href={home} className={styles.brand} onClick={() => setOpen(false)}>
        <LogoMark className={styles.brandMark} />
        Career&nbsp;OS
      </Link>

      <button
        type="button"
        className={styles.menuButton}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <CloseIcon width={22} height={22} />
        ) : (
          <MenuIcon width={22} height={22} />
        )}
      </button>

      {open ? (
        <nav className={styles.mobileMenu}>
          <ul className={styles.navList}>
            {nav_items.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className={`${styles.navItem} ${
                    active === item.key ? styles.navItemActive : ""
                  }`}
                  aria-current={active === item.key ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  <item.icon className={styles.navIcon} />
                  {item.label}
                  {item.badge ? <span className={styles.navBadge}>{item.badge}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
          <form action={logoutAction}>
            <button type="submit" className="btn btn-quiet">
              Sign out
            </button>
          </form>
        </nav>
      ) : null}
    </header>
  );
}
