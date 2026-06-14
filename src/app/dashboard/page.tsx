import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth";
import { listEntries } from "@/lib/entries";
import { compileCv } from "@/lib/entries-core";
import { countOpenRequests } from "@/lib/matching";
import { ArrowIcon } from "@/components/icons";
import styles from "@/app/app.module.css";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "recruiter") redirect("/employer");

  const [entries, open_requests] = await Promise.all([
    listEntries(user.id),
    countOpenRequests(user.id),
  ]);
  const cv = compileCv(entries);
  const refined = entries.length - cv.unrefined_count;
  const first_name = user.name.split(" ")[0];

  return (
    <AppShell user={user} active="overview" requestCount={open_requests}>
      <header className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Hello, {first_name}.</h1>
        <p className={styles.pageLede}>
          Here&apos;s the state of your record. The more you log, the sharper the
          long view gets.
        </p>
      </header>

      {user.skills.length === 0 ? (
        <Link
          href="/profile"
          className={styles.panel}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            marginBottom: "1.5rem",
            borderColor: "var(--accent)",
          }}
        >
          <span>
            <strong>Add your skills</strong> so employers can match you and you can
            discover roles. Two minutes on your profile.
          </span>
          <ArrowIcon width={18} height={18} style={{ color: "var(--accent)" }} />
        </Link>
      ) : null}

      {open_requests > 0 ? (
        <Link
          href="/requests"
          className={styles.panel}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            marginBottom: "1.5rem",
            borderColor: "var(--accent)",
          }}
        >
          <span>
            <strong>
              {open_requests} interview request{open_requests === 1 ? "" : "s"}
            </strong>{" "}
            waiting — an employer matched your logged work.
          </span>
          <ArrowIcon width={18} height={18} style={{ color: "var(--accent)" }} />
        </Link>
      ) : null}

      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statValue}>{entries.length}</div>
          <div className={styles.statLabel}>Entries logged</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{refined}</div>
          <div className={styles.statLabel}>Refined into bullets</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{cv.skills.length}</div>
          <div className={styles.statLabel}>Distinct skills surfaced</div>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className={styles.empty}>
          <h3>Your ledger is empty — that&apos;s the only thing to fix today.</h3>
          <p style={{ marginBottom: "1.5rem" }}>
            Log one thing you did this week. Rough words are fine; refinement
            comes later.
          </p>
          <Link href="/ledger" className="btn btn-primary">
            Write your first entry
            <ArrowIcon width={18} height={18} />
          </Link>
        </div>
      ) : (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Recent entries</h2>
          <ul className={styles.quickList}>
            {entries.slice(0, 5).map((entry) => (
              <li key={entry.id} className={styles.quickItem}>
                <div>
                  <strong>{entry.title ?? entry.raw_text.slice(0, 48)}</strong>
                  <div className="muted" style={{ fontSize: "0.85rem", marginTop: "0.15rem" }}>
                    <span className="tag" style={{ marginRight: "0.5rem" }}>
                      {entry.type}
                    </span>
                    {entry.status === "refined" ? "Refined" : "Raw — not yet refined"}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div style={{ marginTop: "1.25rem", display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
            <Link href="/ledger" className="btn btn-ghost">
              Open the ledger
            </Link>
            <Link href="/cv" className="btn btn-ghost">
              View your CV
            </Link>
          </div>
        </section>
      )}
    </AppShell>
  );
}
