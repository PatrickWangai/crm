import Image from "next/image";
import Link from "next/link";
import { listPublicBusinessUnits } from "@/lib/services/public-support.service";
import { isAiAssistantEnabledPublic } from "@/lib/services/ai.service";
import { getSettingValue } from "@/lib/services/settings.service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PublicSupportForm } from "@/components/support/public-support-form";
import { TrackRequestForm } from "@/components/support/track-request-form";
import { HelpChatbot } from "@/components/support/help-chatbot";

export const metadata = { title: "Help & Support — Masterways" };
// No auth check on this route (it's public), so nothing else forces dynamic
// rendering — without this, Next would statically prerender it at build
// time and freeze the support email / business unit list / AI flag until
// the next deploy, even though admins can change all three at runtime.
export const dynamic = "force-dynamic";

export default async function HelpAndSupportPage() {
  const [businessUnits, aiEnabled, companyName, supportEmail] = await Promise.all([
    listPublicBusinessUnits(),
    isAiAssistantEnabledPublic(),
    getSettingValue("companyName"),
    getSettingValue("supportEmail"),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-md border border-border bg-white p-1">
              <Image src="/logo.jpeg" alt={companyName} width={32} height={32} className="size-full object-contain" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">{companyName}</p>
              <p className="text-[11px] text-muted-foreground">Help &amp; Support</p>
            </div>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">How can we help?</h1>
          <p className="text-sm text-muted-foreground">
            Submit a complaint, service request or general inquiry and our team will follow up. Every request is routed
            to the right department automatically.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
          <Tabs defaultValue="submit">
            <TabsList>
              <TabsTrigger value="submit">Submit a request</TabsTrigger>
              <TabsTrigger value="track">Track a request</TabsTrigger>
            </TabsList>
            <TabsContent value="submit" className="pt-4">
              <PublicSupportForm businessUnits={businessUnits} aiEnabled={aiEnabled} />
            </TabsContent>
            <TabsContent value="track" className="pt-4">
              <TrackRequestForm />
            </TabsContent>
          </Tabs>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Masterways staff, sign in at{" "}
          <Link href="/login" className="text-primary hover:underline">
            the workspace login
          </Link>
          .
        </p>
      </main>

      {aiEnabled && <HelpChatbot supportEmail={supportEmail} />}
    </div>
  );
}
