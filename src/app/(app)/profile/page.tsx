import { requireUser } from "@/lib/rbac/guard";
import { getOwnProfile } from "@/lib/services/user.service";
import {
  listTransferCandidates,
  listMyOutgoingTransfers,
  listMyIncomingTransfers,
  listMyActiveTemporaryHandoffs,
  canDeleteOwnAccount,
} from "@/lib/services/transfer.service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { TransferSection } from "@/components/profile/transfer-section";
import { NotificationDelegateForm } from "@/components/profile/notification-delegate-form";
import { DeleteAccountButton } from "@/components/profile/delete-account-button";
import { updatePhoneAction } from "./actions";
import { initials } from "@/lib/utils";
import { Mail, Phone, Briefcase, Building2, Landmark, Users } from "lucide-react";

export default async function ProfilePage() {
  const user = await requireUser();
  const [profile, transferCandidates, outgoingTransfers, incomingTransfers, activeTemporaryHandoffs, deletionEligible] = await Promise.all([
    getOwnProfile(),
    listTransferCandidates(),
    listMyOutgoingTransfers(),
    listMyIncomingTransfers(),
    listMyActiveTemporaryHandoffs(),
    canDeleteOwnAccount(),
  ]);
  if (!profile) return null;

  const permissionsByModule = new Map<string, string[]>();
  for (const rp of profile.role.rolePermissions) {
    const list = permissionsByModule.get(rp.permission.module) ?? [];
    list.push(rp.permission.action);
    permissionsByModule.set(rp.permission.module, list);
  }

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="My Profile" description="View your account details and manage your security settings." />

      <Card>
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center">
          <Avatar className="size-16">
            <AvatarFallback className="text-lg">{initials(profile.firstName, profile.lastName)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{profile.firstName} {profile.lastName}</h2>
              <Badge>{profile.role.name}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{profile.jobTitle ?? "—"}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Mail className="size-3.5" /> {profile.email}</span>
              {profile.phone && <span className="flex items-center gap-1"><Phone className="size-3.5" /> {profile.phone}</span>}
              {profile.employeeId && <span className="flex items-center gap-1"><Briefcase className="size-3.5" /> {profile.employeeId}</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
            <CardDescription>Your department, business unit and reporting line.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow icon={Building2} label="Department" value={profile.department?.name ?? "—"} />
            <InfoRow icon={Landmark} label="Business unit" value={profile.businessUnit?.name ?? "—"} />
            <InfoRow
              icon={Users}
              label="Reports to"
              value={profile.reportingTo ? `${profile.reportingTo.firstName} ${profile.reportingTo.lastName}` : "—"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact details</CardTitle>
            <CardDescription>Update your phone number.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updatePhoneAction} className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="phone">Phone number</Label>
                <Input id="phone" name="phone" defaultValue={profile.phone ?? ""} placeholder="+254 7XX XXX XXX" />
              </div>
              <Button type="submit">Save</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Change your password. Use at least 8 characters.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My access</CardTitle>
          <CardDescription>Modules and actions granted to your role, {profile.role.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from(permissionsByModule.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([module, actions]) => (
                <div key={module} className="rounded-md border border-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {module.replace(/_/g, " ")}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {actions.map((action) => (
                      <Badge key={action} variant="outline" className="text-[11px]">
                        {action.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
          </div>
          {permissionsByModule.size === 0 && (
            <>
              <Separator className="my-2" />
              <p className="text-sm text-muted-foreground">Your role has no permissions assigned yet.</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification delegate</CardTitle>
          <CardDescription>A backup contact who also receives your notifications — useful while you&apos;re away, doesn&apos;t replace you.</CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationDelegateForm candidates={transferCandidates} currentDelegateId={profile.notificationDelegateId ?? null} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leave &amp; hand off</CardTitle>
          <CardDescription>Transfer your work — and your role, if you hold a department head role — to a teammate, with their explicit acceptance required.</CardDescription>
        </CardHeader>
        <CardContent>
          <TransferSection
            currentUserId={user.id}
            candidates={transferCandidates}
            outgoing={outgoingTransfers}
            incoming={incomingTransfers}
            activeTemporary={activeTemporaryHandoffs}
          />
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Deactivate account</CardTitle>
          <CardDescription>Only available once a successor has accepted a hand-off above — that&apos;s the &quot;verified on both ends&quot; check.</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountButton eligible={deletionEligible} />
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" /> {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
