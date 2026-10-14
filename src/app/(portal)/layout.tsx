import { ContentBoundary } from "@/components/portal/ContentBoundary";
import { Suspense } from "react";
import { getPortalIdentity } from "@/lib/account/data";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalHeader } from "@/components/portal/PortalHeader";

async function IdentityHeader() {
  const { user, employee, avatar, accessRole } = await getPortalIdentity();
  return <PortalHeader
    name={employee?.full_name || String(user.user_metadata.full_name || "همکار زیلبر")}
    avatar={avatar}
    email={user.email}
    gender={employee?.gender}
    accessRole={accessRole}
    role={[employee?.job_title, employee?.department].filter(Boolean).join(" · ")}
  />;
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell header={<ContentBoundary fallback={<PortalHeader name="حساب کاربری" pending />}><Suspense fallback={<PortalHeader name="حساب کاربری" pending />}>
    <IdentityHeader />
  </Suspense></ContentBoundary>}>{children}</PortalShell>;
}
