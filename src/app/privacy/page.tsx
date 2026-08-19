import Link from "next/link";
import Image from "next/image";
import { getSettingValue } from "@/lib/services/settings.service";

export const metadata = { title: "Privacy Notice — Masterways" };
export const dynamic = "force-dynamic";

export default async function PrivacyNoticePage() {
  const [companyName, supportEmail] = await Promise.all([getSettingValue("companyName"), getSettingValue("supportEmail")]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center gap-2.5">
          <Link href="/help" className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-md border border-border bg-white p-1">
              <Image src="/logo.jpeg" alt={companyName} width={32} height={32} className="size-full object-contain" />
            </div>
            <p className="text-sm font-semibold">{companyName}</p>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-10 text-sm leading-relaxed sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Privacy Notice</h1>
          <p className="mt-1 text-xs text-muted-foreground">Help &amp; Support portal — last updated {new Date().toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>

        <Section title="What we collect">
          When you submit a request through this portal, we collect your name, email and/or phone number, and the details you
          provide about your request (category, subject, description). If you use the chat assistant, we collect the same
          information gathered conversationally.
        </Section>

        <Section title="Why we collect it">
          Solely to respond to and resolve your request, and to route it to the {companyName} team responsible for that kind of
          issue. We do not use this information for marketing, and we do not sell or share it with third parties outside{" "}
          {companyName}.
        </Section>

        <Section title="Who can see it">
          Staff at {companyName} responsible for handling your type of request (for example, Customer Care, Finance, or Property
          Management, depending on what your request is about).
        </Section>

        <Section title="How long we keep it">
          We keep request records for as long as reasonably needed to resolve your request and maintain service history.
        </Section>

        <Section title="Your rights">
          Under Kenya&apos;s Data Protection Act, 2019, you have the right to access, correct, or request deletion of your
          personal data. To exercise any of these rights, or if you have questions about this notice, contact us at{" "}
          <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">
            {supportEmail}
          </a>
          .
        </Section>

        <Section title="Cookies &amp; tracking">This portal does not use analytics or advertising cookies.</Section>

        <p className="pt-4 text-center text-xs text-muted-foreground">
          <Link href="/help" className="text-primary hover:underline">
            Back to Help &amp; Support
          </Link>
        </p>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="text-muted-foreground">{children}</p>
    </section>
  );
}
