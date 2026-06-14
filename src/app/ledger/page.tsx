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

  const entries = listEntries(user.id);
  const open_requests = countOpenRequests(user.id);

  return (
    <AppShell user={user} active="ledger" requestCount={open_requests}>
      <header className={styles.pageHead}>
        <h1 className={styles.pageTitle}>The Living Ledger</h1>
        <p className={styles.pageLede}>
          Log the work as it happens — projects, decisions, the moments you led.
          When you&apos;re ready, refine any entry into a CV-ready line. We never
          invent a number you didn&apos;t state.
        </p>
      </header>
      <LedgerWorkspace initialEntries={entries} />
    </AppShell>
  );
}
