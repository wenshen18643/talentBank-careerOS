import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import ProfileForm from "@/components/ProfileForm";
import { getCurrentUser } from "@/lib/auth";
import { countOpenRequests } from "@/lib/matching";
import appStyles from "@/app/app.module.css";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "recruiter") redirect("/employer");

  const open_requests = await countOpenRequests(user.id);

  return (
    <AppShell user={user} active="profile" requestCount={open_requests}>
      <header className={appStyles.pageHead}>
        <h1 className={appStyles.pageTitle}>Your profile</h1>
        <p className={appStyles.pageLede}>
          Your skills and location are how employers find you and how you discover
          roles. Both come from a shared list so matches are exact, not guesswork.
        </p>
      </header>
      <ProfileForm user={user} />
    </AppShell>
  );
}
