import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import LedgerWorkspace from "@/components/LedgerWorkspace";
import { getCurrentUser } from "@/lib/auth";
import { listEntries } from "@/lib/entries";
import { countOpenRequests } from "@/lib/matching";
import styles from "@/app/app.module.css";

export default async function LedgerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "recruiter") redirect("/employer");

  const entries = await listEntries(user.id);
  const open_requests = await countOpenRequests(user.id);

  return (
    <AppShell user={user} active="ledger" requestCount={open_requests}>
      <header className={styles.pageHead}>
        <h1 className={styles.pageTitle}>The Living Ledger</h1>
        <p className={styles.pageLede}>
          Capture the work in real time: the projects, the decisions, and the leadership moments. 
          Transform them into high-impact, resume-ready bullet points whenever you're ready
        </p>
      </header>
      <LedgerWorkspace initialEntries={entries} />
    </AppShell>
  );
}
