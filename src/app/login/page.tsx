import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "@/components/auth/login-form";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo-accounts";
import { ROLES } from "@/lib/rbac/roles";
import { ShieldCheck, Workflow, BarChart3 } from "lucide-react";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const roleName = (slug: string) => ROLES.find((r) => r.slug === slug)?.name ?? slug;

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(47,127,209,0.35),transparent_55%)]" />
        <div className="relative flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-md bg-white p-1.5">
            <Image src="/logo.jpeg" alt="Masterways" width={36} height={36} className="size-full object-contain" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Masterways CRM</p>
            <p className="text-xs text-sidebar-foreground/70">Group of Companies</p>
          </div>
        </div>

        <div className="relative max-w-md space-y-6">
          <h1 className="text-3xl font-semibold leading-tight text-white">
            One platform for every customer, member and property relationship.
          </h1>
          <p className="text-sm leading-relaxed text-sidebar-foreground/80">
            Centralized records, sales pipelines, service tickets, property operations and
            reporting across Real Estate, SACCO, Insurance and Housing — built from the MGC
            CRM Blueprint.
          </p>
          <div className="space-y-3 pt-2">
            <Feature icon={ShieldCheck} text="Role-based access control enforced at the data layer" />
            <Feature icon={Workflow} text="Lead-to-close pipelines, SLA-tracked tickets and workflows" />
            <Feature icon={BarChart3} text="Role-aware dashboards and organization-wide reporting" />
          </div>
        </div>

        <p className="relative text-xs text-sidebar-foreground/50">
          &copy; {new Date().getFullYear()} Masterways Group of Companies. Internal system.
        </p>
      </div>

      <div className="flex items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-1.5 lg:hidden">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-md border border-border bg-white p-1.5">
                <Image src="/logo.jpeg" alt="Masterways" width={36} height={36} className="size-full object-contain" />
              </div>
              <p className="text-sm font-semibold">Masterways CRM</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold">Sign in to your workspace</h2>
            <p className="text-sm text-muted-foreground">Enter your credentials to continue.</p>
          </div>

          <LoginForm />

          <details className="rounded-md border border-border bg-secondary/40 px-3 py-2.5 text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none font-medium text-foreground">
              Demo accounts (internal testing)
            </summary>
            <div className="mt-2 space-y-1">
              <p>
                Shared password for every demo account:{" "}
                <code className="rounded bg-secondary px-1 py-0.5 font-mono text-foreground">{DEMO_PASSWORD}</code>
              </p>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1">
                {DEMO_ACCOUNTS.map((account) => (
                  <li key={account.email} className="flex items-center justify-between gap-2">
                    <span className="truncate">{roleName(account.roleSlug)}</span>
                    <code className="shrink-0 text-foreground/80">{account.email}</code>
                  </li>
                ))}
              </ul>
            </div>
          </details>

          <p className="text-center text-xs text-muted-foreground">
            Trouble signing in? Contact your{" "}
            <Link href="mailto:ict@masterways.co.ke" className="text-primary hover:underline">
              ICT Administrator
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex items-start gap-2.5 text-sm text-sidebar-foreground/85">
      <Icon className="mt-0.5 size-4 shrink-0 text-sidebar-primary" />
      <span>{text}</span>
    </div>
  );
}
