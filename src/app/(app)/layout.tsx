import { redirect } from "next/navigation";
import { getCurrentUser, getEffectiveAccess } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export const dynamic = "force-dynamic";

/** Layout for all authenticated pages. Validates the session server-side. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const allowed = getEffectiveAccess(user.role);

  return (
    <AppShell user={{ name: user.name, role: user.role, allowed }}>{children}</AppShell>
  );
}
