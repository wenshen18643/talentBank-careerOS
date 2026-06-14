import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import AuthForm from "@/components/AuthForm";
import { loginAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const current = await getCurrentUser();
  if (current) redirect(current.role === "recruiter" ? "/employer" : "/dashboard");
  return (
    <AuthShell>
      <AuthForm mode="login" action={loginAction} />
    </AuthShell>
  );
}
