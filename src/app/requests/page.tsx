import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import CandidateRequestCard from "@/components/CandidateRequestCard";
import { requireRole, getCurrentUser } from "@/lib/auth";
import { countOpenRequests, listRequestsForCandidate } from "@/lib/matching";
import { listMessages } from "@/lib/messages";
import appStyles from "@/app/app.module.css";

export default async function RequestsPage() {
  const user = await requireRole("candidate");
  if (!user) {
    const current = await getCurrentUser();
    redirect(current ? "/employer" : "/login");
  }

  const [requests, open] = await Promise.all([
    listRequestsForCandidate(user.id),
    countOpenRequests(user.id),
  ]);
  const messagesByRequest = new Map(
    await Promise.all(
      requests
        .filter((r) => r.candidate_reply === "accepted")
        .map(async (r) => [r.id, await listMessages(r.id)] as const),
    ),
  );

  return (
    <AppShell user={user} active="requests" requestCount={open}>
      <header className={appStyles.pageHead}>
        <h1 className={appStyles.pageTitle}>Interview requests</h1>
        <p className={appStyles.pageLede}>
          Employers only reach you after their role genuinely matched your logged work —
          and only once you&apos;ve been approved. Each request shows their reason. You
          decide whether to engage.
        </p>
      </header>

      {requests.length === 0 ? (
        <div className={appStyles.empty}>
          <h3>No requests yet.</h3>
          <p style={{ marginBottom: "1.5rem" }}>
            The fuller your ledger, the more findable you are for the right reason. Keep
            logging.
          </p>
          <Link href="/ledger" className="btn btn-primary">
            Add to your ledger
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {requests.map((request) => (
            <CandidateRequestCard
              key={request.id}
              request={request}
              candidateId={user.id}
              messages={messagesByRequest.get(request.id) ?? []}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
