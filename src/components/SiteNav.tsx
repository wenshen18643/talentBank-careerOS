import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LogoMark } from "@/components/icons";
import styles from "@/app/landing.module.css";

/**
 * Top navigation for public pages. Shows auth-aware actions: a path into the
 * app when signed in, sign-in / get-started when not.
 */
export default async function SiteNav() {
  const user = await getCurrentUser();

  return (
    <header className={styles.nav}>
      <div className={`container ${styles.navInner}`}>
        <Link href="/" className={styles.brand}>
          <LogoMark className={styles.brandMark} />
          Career&nbsp;OS
        </Link>
        <nav className={styles.navLinks}>
          <Link href="/#how" className={`${styles.navLink} ${styles.navLinksHideMobile}`}>
            How it works
          </Link>
          <Link
            href="/#honest"
            className={`${styles.navLink} ${styles.navLinksHideMobile}`}
          >
            Why it&apos;s different
          </Link>
          {user ? (
            <Link
              href={user.role === "recruiter" ? "/employer" : "/dashboard"}
              className="btn btn-primary"
            >
              Open workspace
            </Link>
          ) : (
            <>
              <Link href="/login" className={styles.navLink}>
                Sign in
              </Link>
              <Link href="/signup" className="btn btn-primary">
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
