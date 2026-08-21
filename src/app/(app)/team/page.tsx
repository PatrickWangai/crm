import { requirePermissionOrRedirect } from "@/lib/rbac/guard";
import { listOwnDepartmentTeam, listOwnDepartmentAssignableRoles, listSuccessionCandidates } from "@/lib/services/user.service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TeamMemberFormSheet } from "@/components/team/team-member-form-sheet";
import { SuccessionDialog } from "@/components/team/succession-dialog";
import { initials } from "@/lib/utils";
import { Users as UsersIcon } from "lucide-react";

export default async function TeamPage() {
  const currentUser = await requirePermissionOrRedirect("users.manage_department");

  const departmentName = currentUser.department?.name ?? "Your department";
  const [team, roles, successionCandidates] = await Promise.all([listOwnDepartmentTeam(), listOwnDepartmentAssignableRoles(), listSuccessionCandidates()]);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="My Team"
        description={`Add teammates to ${departmentName} — they can accept and work customer tickets routed here as soon as they're created.`}
        actions={
          <div className="flex flex-wrap gap-2">
            {successionCandidates.length > 0 && <SuccessionDialog headRoleName={currentUser.role.name} candidates={successionCandidates} />}
            <TeamMemberFormSheet roles={roles} departmentName={departmentName} />
          </div>
        }
      />

      <Card>
        <CardContent className="p-0">
          {team.length === 0 ? (
            <EmptyState icon={UsersIcon} title="No teammates yet" description="Add the first person to your department." className="border-none py-10" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{initials(member.firstName, member.lastName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {member.firstName} {member.lastName}
                            {member.id === currentUser.id && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{member.role.name}</TableCell>
                    <TableCell>
                      <StatusBadge status={member.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
