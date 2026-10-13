import { Suspense } from "react";
import { getAccount } from "@/lib/account/data";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalSkeleton } from "@/components/portal/PortalSkeleton";

async function AuthenticatedPortal({ children }: { children: React.ReactNode }) {
  const { user, employee, avatar, accessRole } = await getAccount();
  return <PortalShell
    name={employee?.full_name || String(user.user_metadata.full_name || "همکار زیلبر")}
    avatar={avatar}
    email={user.email}
    gender={employee?.gender}
    accessRole={accessRole}
    role={[employee?.job_title, employee?.department].filter(Boolean).join(" · ")}
  >{children}</PortalShell>;
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PortalShell name="حساب کاربری" pending><PortalSkeleton /></PortalShell>}>
    <AuthenticatedPortal>{children}</AuthenticatedPortal>
  </Suspense>;
}
