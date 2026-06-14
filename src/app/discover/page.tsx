import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import FindJobsWorkspace from "@/components/FindJobsWorkspace";
import { getCurrentUser } from "@/lib/auth";
import { countOpenRequests, listDiscoverJobs } from "@/lib/matching";
import { raiseHandAction } from "@/app/actions/candidate";
import appStyles from "@/app/app.module.css";
import styles from "@/app/employer.module.css";

const pipeline_copy: Record<string, string> = {
  surfaced: "You're in this pipeline — awaiting the employer's review.",
  approved: "This employer has reached out — see your requests.",
  rejected: "Not taken forward this time.",
};

export default async function DiscoverPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "recruiter") redirect("/employer");

  const [open_requests, jobs] = await Promise.all([
    countOpenRequests(user.id),
    user.skills.length > 0
      ? listDiscoverJobs(user.id)
      : Promise.resolve([] as Awaited<ReturnType<typeof listDiscoverJobs>>),
  ]);

  return (
    <AppShell user={user} active="discover" requestCount={open_requests}>
      <header className={appStyles.pageHead}>
        <h1 className={appStyles.pageTitle}>Discover roles</h1>
        <p className={appStyles.pageLede}>
          Only roles your profile skills genuinely match — no endless listings.
          Raise your hand and you enter that employer&apos;s pipeline with a reason
          attached, same as an engine match.
        </p>
      </header>

      {user.skills.length === 0 ? (
        <div className={appStyles.empty}>
          <h3>Add your skills first.</h3>
          <p style={{ marginBottom: "1.5rem" }}>
            We match roles to the skills on your profile. Add a few to see roles
            you fit.
          </p>
          <Link href="/profile" className="btn btn-primary">
            Set up your profile
          </Link>
        </div>
      ) : (
        <>
          <FindJobsWorkspace />

          <section style={{ marginTop: "3rem" }}>
            <h2 className={styles.pipelineTitle} style={{ fontSize: "1.4rem", marginBottom: "1.25rem" }}>
              Browse roles you qualify for
            </h2>
            {jobs.length === 0 ? (
              <div className={appStyles.empty}>
                <h3>No matching roles open right now.</h3>
                <p>
                  Nothing open fits your current skills. Broaden your profile or
                  check back — new roles match automatically.
                </p>
              </div>
            ) : (
              <div className={styles.jobList}>
          {jobs.map((job) => (
            <article key={job.id} className={styles.jobCard} style={{ cursor: "default" }}>
              <div className={styles.jobCardTop}>
                <h2 className={styles.jobTitle}>{job.title}</h2>
              </div>
              <p className={styles.jobMeta}>
                {job.employer_company ?? "An employer"} ·{" "}
                {job.location ?? "Location flexible"}
              </p>
              {job.description ? (
                <p className="muted" style={{ marginTop: "0.6rem", maxWidth: "60ch" }}>
                  {job.description.slice(0, 180)}
                  {job.description.length > 180 ? "…" : ""}
                </p>
              ) : null}

              <div style={{ marginTop: "0.9rem", display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {job.matched_skills.map((skill) => (
                  <span key={skill} className="tag">
                    {skill}
                  </span>
                ))}
              </div>

              <div className={styles.matchActions}>
                {job.pipeline_status === "none" ? (
                  <form action={raiseHandAction}>
                    <input type="hidden" name="job_id" value={job.id} />
                    <button type="submit" className="btn btn-primary">
                      Raise your hand
                    </button>
                  </form>
                ) : (
                  <span className={job.pipeline_status === "approved" ? styles.replyState : "muted"}>
                    {pipeline_copy[job.pipeline_status]}
                  </span>
                )}
              </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}
