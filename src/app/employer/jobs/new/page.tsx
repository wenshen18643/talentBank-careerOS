import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import JobForm from "@/components/JobForm";
import { requireRole, getCurrentUser } from "@/lib/auth";
import { createJobAction } from "@/app/actions/employer";
import appStyles from "@/app/app.module.css";

export default async function NewJobPage() {
  const user = await requireRole("recruiter");
  if (!user) {
    const current = await getCurrentUser();
    redirect(current ? "/dashboard" : "/login");
  }

  return (
    <AppShell user={user} active="new">
      <header className={appStyles.pageHead}>
        <h1 className={appStyles.pageTitle}>Post a role</h1>
        <p className={appStyles.pageLede}>
          The more honestly you describe the trajectory — not just the skill
          checklist — the better the matches and the clearer their reasons.
        </p>
      </header>
      <JobForm action={createJobAction} submitLabel="Create role" />
    </AppShell>
  );
}
