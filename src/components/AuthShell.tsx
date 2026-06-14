import Link from "next/link";
import { LogoMark } from "@/components/icons";
import styles from "@/app/auth.module.css";

/**
 * Two-pane layout for auth screens: a calm dark aside carrying the brand
 * promise, and the form pane on the right (passed as children).
 */
export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.aside}>
        <Link href="/" className={styles.asideBrand}>
          <LogoMark className={styles.asideMark} />
          Career&nbsp;OS
        </Link>
        <p className={styles.asideQuote}>
          The best time to write your CV is years before you need it.
        </p>
        <p className={styles.asideMeta}>
          Log the work as it happens. We&apos;ll keep the long view.
        </p>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
