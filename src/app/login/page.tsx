import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CircleAlert, LogIn, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  not_configured:
    "Sign-in isn't set up yet. An administrator needs to add the OIDC_ISSUER and OIDC_CLIENT_ID settings.",
  provider_unreachable: "The sign-in provider can't be reached right now. Try again in a minute.",
  expired: "That sign-in attempt timed out. Start again.",
  no_email: "Your account has no email address on file with the sign-in provider. Contact IT.",
  domain: "Accounts from that email domain can't sign in to this helpdesk.",
  conflict: "Another account already uses your email address. Ask an administrator for help.",
  inactive: "Your helpdesk account has been deactivated.",
  signin_failed: "Sign-in didn't complete. Try again, and contact IT if it keeps happening.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; signed_out?: string }>;
}) {
  const sp = await searchParams;
  if (await getCurrentUser()) redirect("/");
  const error = sp.error ? (ERRORS[sp.error] ?? ERRORS.signin_failed) : null;
  const href = `/auth/login${sp.next ? `?next=${encodeURIComponent(sp.next)}` : ""}`;

  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="flex flex-col justify-between bg-sidebar px-8 py-10 text-sidebar-foreground sm:px-12 lg:py-14">
        <div className="flex items-center gap-2.5 font-semibold text-white">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Ticket className="size-4.5" />
          </span>
          {env.orgName}
        </div>
        <div className="my-12 max-w-md">
          <h1 className="text-3xl leading-tight font-semibold text-white sm:text-4xl">
            Something not working? Tell IT here.
          </h1>
          <p className="mt-4 text-base leading-relaxed">
            Open a ticket, add a screenshot, and follow the fix from first reply to resolved. Common
            answers are in the knowledge base.
          </p>
        </div>
        <p className="text-sm text-sidebar-muted">Use the same account you use for email.</p>
      </section>

      <section className="flex items-center px-8 py-12 sm:px-12">
        <div className="w-full max-w-sm">
          <h2 className="text-xl font-semibold">Sign in</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            You&apos;ll be sent to {env.oidcProviderName} and brought straight back.
          </p>
          {error && (
            <p role="alert" className="mt-5 flex gap-2 rounded-md bg-danger-bg px-3 py-2.5 text-sm text-danger">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          )}
          {sp.signed_out && !error && (
            <p className="mt-5 rounded-md bg-muted px-3 py-2.5 text-sm text-muted-foreground">You&apos;re signed out.</p>
          )}
          <Button asChild size="lg" className="mt-6 w-full">
            <a href={href}>
              <LogIn />
              Sign in with {env.oidcProviderName}
            </a>
          </Button>
        </div>
      </section>
    </main>
  );
}
