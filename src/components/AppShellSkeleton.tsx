import styles from "@/app/app.module.css";
import skeleton from "@/components/skeleton.module.css";

const nav_row_count = 6;
const card_count = 3;

/**
 * Static chrome shown instantly while an authenticated page streams in. Mirrors
 * the AppShell grid so the sidebar frame doesn't flash on navigation, with
 * shimmer placeholders in the content area until the server render resolves.
 * Used by each route's loading.tsx so tab switches feel immediate.
 */
export default function AppShellSkeleton() {
  return (
    <div className={styles.shell} aria-busy="true" aria-label="Loading">
      <aside className={styles.sidebar}>
        <div className={`${skeleton.block} ${skeleton.brand}`} />
        <div className={styles.navList}>
          {Array.from({ length: nav_row_count }).map((_, index) => (
            <div key={index} className={`${skeleton.block} ${skeleton.navRow}`} />
          ))}
        </div>
      </aside>
      <main className={styles.content}>
        <div className={`${skeleton.block} ${skeleton.title}`} />
        <div className={`${skeleton.block} ${skeleton.lede}`} />
        <div className={skeleton.cards}>
          {Array.from({ length: card_count }).map((_, index) => (
            <div key={index} className={`${skeleton.block} ${skeleton.card}`} />
          ))}
        </div>
      </main>
    </div>
  );
}
