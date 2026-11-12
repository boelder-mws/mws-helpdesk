import type { Metadata } from "next";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Settings" />
      <AdminTabs />
      {children}
    </>
  );
}
