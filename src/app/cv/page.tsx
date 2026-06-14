import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth";
import { listEntries } from "@/lib/entries";
import { compileCv } from "@/lib/entries-core";
import { countOpenRequests } from "@/lib/matching";
import CvActions from "@/components/CvActions";
import appStyles from "@/app/app.module.css";
import styles from "@/app/cv.module.css";

const section_titles: Record<string, string> = {
  project: "Projects & Delivery",
  decision: "Key Decisions",
  leadership: "Leadership",
  skill: "Skills in Practice",
  win: "Wins",
};

export default async function CvPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "recruiter") redirect("/employer");

  const entries = await listEntries(user.id);
  const cv = compileCv(entries);
  const open_requests = await countOpenRequests(user.id);

  return (
    <AppShell user={user} active="cv" requestCount={open_requests}>
      <header className={appStyles.pageHead}>
        <div
          style={{
            display: "flex",
            gap: "1rem",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <h1 className={appStyles.pageTitle}>Your CV</h1>
          {cv.sections.length > 0 ? (
            <CvActions
              cv={{
                name: user.name,
                headline: user.headline ?? "Building a continuous career record",
                location: user.location,
                skills: user.skills,
                sections: cv.sections.map((section) => ({
                  type: section.type,
                  label: section_titles[section.type] ?? section.type,
                  bullets: section.bullets,
                })),
              }}
            />
          ) : null}
        </div>
        <p className={appStyles.pageLede}>
          Compiled live from your refined ledger entries. Nothing here was
          written the night before — it&apos;s the record you kept all along.
        </p>
      </header>

      {cv.sections.length === 0 ? (
        <div className={appStyles.empty}>
          <h3>No refined entries yet.</h3>
          <p style={{ marginBottom: "1.5rem" }}>
            Log work in the ledger, run Improve&nbsp;&amp; Expand on it, and the
            bullets will appear here automatically.
          </p>
          <Link href="/ledger" className="btn btn-primary">
            Go to the ledger
          </Link>
        </div>
      ) : (
        <article id="cv-print" className={styles.doc}>
          <header className={styles.docHead}>
            <h2 className={styles.docName}>{user.name}</h2>
            <p className={styles.docMeta}>
              {user.headline ?? "Building a continuous career record"}
              {user.location ? ` · ${user.location}` : ""}
            </p>
          </header>

          {cv.unrefined_count > 0 ? (
            <p className={styles.callout}>
              {cv.unrefined_count} raw{" "}
              {cv.unrefined_count === 1 ? "entry is" : "entries are"} not refined
              yet — refine{" "}
              {cv.unrefined_count === 1 ? "it" : "them"} in the ledger to add{" "}
              {cv.unrefined_count === 1 ? "it" : "them"} here.
            </p>
          ) : null}

          {user.skills.length > 0 ? (
            <section className={styles.section}>
              <div className={styles.sectionLabel}>Skills</div>
              <div className={styles.skills}>
                {user.skills.map((skill) => (
                  <span key={skill} className="tag">{skill}</span>
                ))}
              </div>
            </section>
          ) : null}

          {cv.sections.map((section) => (
            <section key={section.type} className={styles.section}>
              <div className={styles.sectionLabel}>
                {section_titles[section.type] ?? section.type}
              </div>
              <ul className={styles.bullets}>
                {section.bullets.map((item) => (
                  <li key={item.id} className={styles.bullet}>
                    <span className={styles.bulletMark} aria-hidden>◆</span>
                    <span>
                      {item.title ? (
                        <span className={styles.bulletTitle}>{item.title} —</span>
                      ) : null}
                      {item.bullet}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </article>
      )}
    </AppShell>
  );
}
