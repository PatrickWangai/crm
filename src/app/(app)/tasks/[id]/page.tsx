import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { requireAnyPermissionOrRedirect, hasPermission, ForbiddenError } from "@/lib/rbac/guard";
import { getTaskDetail } from "@/lib/services/task.service";
import { listDepartmentOptions, listUserOptions } from "@/lib/services/lookups.service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskFormSheet } from "@/components/tasks/task-form-sheet";
import { TaskStatusControl } from "@/components/tasks/task-status-control";
import { AssignTaskSelect } from "@/components/tasks/assign-task-select";
import { DeleteTaskButton } from "@/components/tasks/delete-task-button";
import { TaskCommentForm } from "@/components/tasks/task-comment-form";
import { CheckSquare, User as UserIcon, Calendar, Building2, Link as LinkIcon, MessageSquare } from "lucide-react";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAnyPermissionOrRedirect(["tasks.view_all", "tasks.view_own"]);
  const { id } = await params;

  let task: Awaited<ReturnType<typeof getTaskDetail>>;
  let departments: Awaited<ReturnType<typeof listDepartmentOptions>>;
  let staff: Awaited<ReturnType<typeof listUserOptions>>;
  try {
    [task, departments, staff] = await Promise.all([getTaskDetail(id), listDepartmentOptions(), listUserOptions()]);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect("/forbidden");
    throw err;
  }
  if (!task) notFound();

  const canUpdate = hasPermission(user, "tasks.update");
  const canDelete = hasPermission(user, "tasks.delete");
  const canAssign = hasPermission(user, "tasks.assign");

  const relatedLink = task.relatedStakeholder
    ? { href: `/stakeholders/${task.relatedStakeholder.id}`, label: `${task.relatedStakeholder.firstName} ${task.relatedStakeholder.lastName}` }
    : task.relatedLead
      ? { href: `/leads/${task.relatedLead.id}`, label: `${task.relatedLead.firstName} ${task.relatedLead.lastName}` }
      : task.relatedTicket
        ? { href: `/tickets/${task.relatedTicket.id}`, label: task.relatedTicket.subject }
        : task.relatedProperty
          ? { href: `/properties/${task.relatedProperty.id}`, label: task.relatedProperty.name }
          : null;

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title={task.title}
        breadcrumbs={[{ label: "Tasks", href: "/tasks" }, { label: task.code }]}
        actions={canDelete ? <DeleteTaskButton taskId={task.id} title={task.title} /> : undefined}
      />

      <Card>
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckSquare className="size-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{task.title}</h2>
                <StatusBadge status={task.status} />
                <StatusBadge status={task.priority} />
              </div>
              <p className="text-sm text-muted-foreground">{task.code}</p>
              {relatedLink && (
                <Link href={relatedLink.href} className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <LinkIcon className="size-3" /> {relatedLink.label}
                </Link>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canUpdate && <TaskStatusControl taskId={task.id} currentStatus={task.status} />}
            {canUpdate && (
              <TaskFormSheet
                mode="edit"
                taskId={task.id}
                staff={staff}
                departments={departments}
                defaultValues={{
                  title: task.title,
                  description: task.description,
                  priority: task.priority,
                  dueDate: null,
                  assigneeId: task.assigneeId,
                  departmentId: task.departmentId,
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">{task.description || "No description provided."}</p>
              <InfoRow icon={Calendar} label="Due date" value={task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"} />
              <InfoRow icon={Building2} label="Department" value={task.department?.name ?? "—"} />
              <InfoRow icon={Calendar} label="Created" value={formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })} />
              {task.completedAt && <InfoRow icon={Calendar} label="Completed" value={new Date(task.completedAt).toLocaleString()} />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <UserIcon className="size-4" /> Assignee
                </span>
                {canAssign ? (
                  <AssignTaskSelect taskId={task.id} staff={staff} currentAssigneeId={task.assigneeId} />
                ) : (
                  <span className="font-medium">{task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : "Unassigned"}</span>
                )}
              </div>
              <InfoRow icon={UserIcon} label="Created by" value={task.createdBy ? `${task.createdBy.firstName} ${task.createdBy.lastName}` : "—"} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comments */}
        <TabsContent value="comments">
          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
              <CardDescription>Progress notes on this task.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {canUpdate && <TaskCommentForm taskId={task.id} />}
              {task.comments.length === 0 ? (
                <EmptyState icon={MessageSquare} title="No comments yet" className="border-none py-8" />
              ) : (
                <ul className="space-y-3">
                  {task.comments.map((c) => (
                    <li key={c.id} className="rounded-md border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{c.user ? `${c.user.firstName} ${c.user.lastName}` : "System"}</p>
                        <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{c.comment}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" /> {label}
      </span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
