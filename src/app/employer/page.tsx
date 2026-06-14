import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { requireRole, getCurrentUser } from "@/lib/auth";
import { listJobs } from "@/lib/jobs";
import { matchCountsByStatus } from "@/lib/matching";
import { ArrowIcon, PlusIcon } from "@/components/icons";
import appStyles from "@/app/app.module.css";
import styles from "@/app/employer.module.css";

export default async function EmployerOverviewPage() {
  const user = await requireRole("recruiter");
  if (!user) {
    const current = await getCurrentUser();
    redirect(current ? "/dashboard" : "/login");
  }

  const jobs = await listJobs(user.id);
  const countsByJob = new Map(
    (
      await Promise.all(
        jobs.map(async (job) => ({ job, counts: await matchCountsByStatus(job.id) })),
      )
    ).map(({ job, counts }) => [job.id, counts]),
  );

  return (
    <AppShell user={user} active="overview">
      <header className={appStyles.pageHead}>
        <h1 className={appStyles.pageTitle}>Your roles</h1>
        <p className={appStyles.pageLede}>
          Define a role and its criteria once. The engine watches the candidate pool and
          surfaces people whose logged work fits — with a reason you can read, never a
          black-box score.
        </p>
      </header>

      {jobs.length === 0 ? (
        <div className={appStyles.empty}>
          <h3>No roles yet.</h3>
          <p style={{ marginBottom: "1.5rem" }}>
            Post your first role to start surfacing candidates.
          </p>
          <Link href="/employer/jobs/new" className="btn btn-primary">
            <PlusIcon width={18} height={18} />
            Post a role
          </Link>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: "1.5rem" }}>
            <Link href="/employer/jobs/new" className="btn btn-primary">
              <PlusIcon width={18} height={18} />
              Post a role
            </Link>
          </div>
          <div className={styles.jobList}>
            {jobs.map((job) => {
              const counts = countsByJob.get(job.id) ?? { surfaced: 0, approved: 0 };
              return (
                <Link
                  key={job.id}
                  href={`/employer/jobs/${job.id}`}
                  className={styles.jobCard}
                >
                  <div className={styles.jobCardTop}>
                    <h2 className={styles.jobTitle}>{job.title}</h2>
                    <ArrowIcon
                      width={20}
                      height={20}
                      style={{ color: "var(--accent)" }}
                    />
                  </div>
                  <p className={styles.jobMeta}>
                    {job.location ?? "Location flexible"} · {job.required_skills.length}{" "}
                    required skill
                    {job.required_skills.length === 1 ? "" : "s"}
                  </p>
                  <div className={styles.jobCounts}>
                    <span>
                      <strong>{counts.surfaced}</strong> awaiting review
                    </span>
                    <span>
                      <strong>{counts.approved}</strong> approved
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </AppShell>
  );
}
