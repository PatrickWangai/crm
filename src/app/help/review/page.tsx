import Image from "next/image";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { getReviewEligibility } from "@/lib/services/review.service";
import { getSettingValue } from "@/lib/services/settings.service";
import { ReviewForm } from "@/components/support/review-form";

export const metadata = { title: "Rate your experience — Masterways" };
export const dynamic = "force-dynamic";

/**
 * Reached only via the "Rate your experience" link in the ticket-completed
 * email (see customer-events.ts) — ticketNumber + email in the URL are the
 * same shared-secret pairing the public tracker uses, so there's no
 * separate login or token to manage.
 */
export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [companyName, sp] = await Promise.all([getSettingValue("companyName"), searchParams]);
  const ticketNumber = typeof sp.ticketNumber === "string" ? sp.ticketNumber : "";
  const email = typeof sp.email === "string" ? sp.email : "";

  const eligibility = ticketNumber && email ? await getReviewEligibility(ticketNumber, email) : { status: "not_found" as const };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-lg items-center gap-2.5">
          <Link href="/help" className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-md border border-border bg-white p-1">
              <Image src="/logo.jpeg" alt={companyName} width={32} height={32} className="size-full object-contain" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">{companyName}</p>
              <p className="text-[11px] text-muted-foreground">Rate your experience</p>
            </div>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-6 px-4 py-10 sm:px-6">
        {eligibility.status === "eligible" && (
          <>
            <div className="space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight">How did we do?</h1>
              <p className="text-sm text-muted-foreground">Your request {eligibility.ticketNumber} was marked done. A quick rating helps us improve.</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
              <ReviewForm ticketNumber={ticketNumber} email={email} subject={eligibility.subject} />
            </div>
          </>
        )}

        {eligibility.status === "already_reviewed" && (
          <div className="rounded-lg border border-success/30 bg-success-muted/40 p-6 text-center">
            <CheckCircle2 className="mx-auto size-10 text-success" />
            <h3 className="mt-3 text-lg font-semibold">Already reviewed</h3>
            <p className="mt-1 text-sm text-muted-foreground">Thanks — you&apos;ve already shared feedback on this request.</p>
          </div>
        )}

        {eligibility.status === "not_completed" && (
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <AlertCircle className="mx-auto size-10 text-muted-foreground" />
            <h3 className="mt-3 text-lg font-semibold">Not ready to review yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">This request hasn&apos;t been marked done. You&apos;ll get a review link once it is.</p>
          </div>
        )}

        {eligibility.status === "not_found" && (
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <AlertCircle className="mx-auto size-10 text-muted-foreground" />
            <h3 className="mt-3 text-lg font-semibold">We couldn&apos;t verify that link</h3>
            <p className="mt-1 text-sm text-muted-foreground">Use the &quot;Rate your experience&quot; link from your completion email, or double-check the address.</p>
          </div>
        )}
      </main>
    </div>
  );
}
