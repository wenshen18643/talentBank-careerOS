import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import JobForm from "@/components/JobForm";
import EmployerMatchCard from "@/components/EmployerMatchCard";
import ContentSkeleton from "@/components/ContentSkeleton";
import { requireRole, getCurrentUser } from "@/lib/auth";
import { getJob } from "@/lib/jobs";
import { listMatchesForJob } from "@/lib/matching";
import { listMessagesByMatch } from "@/lib/messages";
import {
  deleteJobAction,
  runMatchingAction,
  updateJobAction,
} from "@/app/actions/employer";
import RunMatchingForm from "@/components/RunMatchingForm";
import appStyles from "@/app/app.module.css";
import styles from "@/app/employer.module.css";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("recruiter");
  if (!user) {
    const current = await getCurrentUser();
    redirect(current ? "/dashboard" : "/login");
  }

  const { id } = await params;
  const job = await getJob(user.id, Number(id));
  if (!job) notFound();

  return (
    <AppShell user={user} active="overview">
      <header className={appStyles.pageHead}>
        <h1 className={appStyles.pageTitle}>{job.title}</h1>
        <p className={appStyles.pageLede}>
          {job.location ?? "Location flexible"}
          {job.required_skills.length > 0
            ? ` · requires ${job.required_skills.join(", ")}`
            : ""}
        </p>
      </header>

      <div className={styles.pipelineHead}>
        <h2 className={styles.pipelineTitle}>Pipeline</h2>
        <RunMatchingForm jobId={job.id} action={runMatchingAction} />
      </div>

      <Suspense fallback={<ContentSkeleton />}>
        <Pipeline jobId={job.id} employerId={user.id} />
      </Suspense>

      <section style={{ marginTop: "3rem" }}>
        <h2
          className={styles.pipelineTitle}
          style={{ fontSize: "1.4rem", marginBottom: "1.25rem" }}
        >
          Edit this role
        </h2>
        <JobForm action={updateJobAction} job={job} submitLabel="Save changes" />
        <form action={deleteJobAction} style={{ marginTop: "1.5rem" }}>
          <input type="hidden" name="job_id" value={job.id} />
          <button type="submit" className="btn btn-quiet">
            Delete this role
          </button>
        </form>
      </section>
    </AppShell>
  );
}

/**
 * Streams a role's surfaced and reviewed candidates behind a Suspense boundary
 * so the page header, run-matching control, and edit form render without waiting
 * on the match scan. Message threads for approved candidates are loaded in one
 * batched query rather than per match.
 */
async function Pipeline({ jobId, employerId }: { jobId: number; employerId: number }) {
  const matches = await listMatchesForJob(jobId);
  const surfaced = matches.filter((m) => m.status === "surfaced");
  const decided = matches.filter((m) => m.status !== "surfaced");
  const messagesByMatch = await listMessagesByMatch(
    matches.filter((m) => m.status === "approved").map((m) => m.id),
  );

  if (matches.length === 0) {
    return (
      <div className={appStyles.empty}>
        <h3>No candidates surfaced yet.</h3>
        <p>
          Run <strong>Find matches</strong> to scan the candidate pool against this
          role&apos;s criteria. Only people whose logged work genuinely overlaps will
          appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      {surfaced.length > 0 ? (
        <section style={{ marginBottom: decided.length ? "2.5rem" : 0 }}>
          {surfaced.map((match) => (
            <EmployerMatchCard
              key={match.id}
              match={match}
              employerId={employerId}
              messages={[]}
            />
          ))}
        </section>
      ) : (
        <p className="muted" style={{ marginBottom: "1.5rem" }}>
          Every surfaced candidate has been reviewed.
        </p>
      )}

      {decided.length > 0 ? (
        <section>
          <h3
            className={styles.pipelineTitle}
            style={{ fontSize: "1.2rem", marginBottom: "1rem" }}
          >
            Reviewed
          </h3>
          {decided.map((match) => (
            <EmployerMatchCard
              key={match.id}
              match={match}
              employerId={employerId}
              messages={messagesByMatch.get(match.id) ?? []}
            />
          ))}
        </section>
      ) : null}
    </>
  );
}
