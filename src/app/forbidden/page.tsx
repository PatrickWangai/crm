import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";

export default async function ForbiddenPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="size-7" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold">You don&apos;t have access to this page</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your role{user ? ` (${user.role.name})` : ""} doesn&apos;t include the permissions required
          here. If you believe this is a mistake, contact your ICT Administrator.
        </p>
      </div>
      <Button asChild>
        <Link href={user ? "/dashboard" : "/login"}>{user ? "Back to dashboard" : "Back to login"}</Link>
      </Button>
    </div>
  );
}
