import { MobileBar, Sidebar, SignOutForm, type NavItem } from "@/components/app-nav";
import { isStaff, requireUser } from "@/lib/auth/guards";
import { env } from "@/lib/env";
import { ROLE_LABEL } from "@/lib/labels";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const staff = isStaff(user);
  const items: NavItem[] = [
    ...(staff ? [{ href: "/", label: "Dashboard", icon: "dashboard" } as const] : []),
    { href: "/tickets", label: staff ? "Tickets" : "My tickets", icon: "tickets" },
    { href: "/kb", label: "Knowledge base", icon: "kb" },
    ...(staff ? [{ href: "/reports", label: "Reports", icon: "reports" } as const] : []),
    ...(user.role === "admin" ? [{ href: "/admin", label: "Settings", icon: "admin" } as const] : []),
  ];
  const nav = {
    items,
    orgName: env.orgName,
    user: { name: user.name, email: user.email, role: ROLE_LABEL[user.role] },
  };
  return (
    <>
      <Sidebar {...nav} />
      <MobileBar {...nav} />
      <SignOutForm />
      <main className="lg:pl-60">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </>
  );
}
