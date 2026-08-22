import Link from "next/link";
import { requireAnyPermissionOrRedirect, hasPermission } from "@/lib/rbac/guard";
import { listTasks, listTasksForBoard, listCrossDepartmentAssignedTasks } from "@/lib/services/task.service";
import { listDepartmentOptions, listUserOptions } from "@/lib/services/lookups.service";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/status-badge";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskFormSheet } from "@/components/tasks/task-form-sheet";
import { TaskKanban } from "@/components/tasks/task-kanban";
import { CheckOverdueTasksButton } from "@/components/tasks/check-overdue-tasks-button";
import { CrossDepartmentTasksPanel } from "@/components/tasks/cross-department-tasks-panel";
import { initials } from "@/lib/utils";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import { CheckSquare } from "lucide-react";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAnyPermissionOrRedirect(["tasks.view_all", "tasks.view_own"]);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const status = typeof sp.status === "string" ? (sp.status as TaskStatus) : undefined;
  const priority = typeof sp.priority === "string" ? (sp.priority as TaskPriority) : undefined;
  const page = typeof sp.page === "string" ? Number(sp.page) || 1 : 1;
  const view = sp.view === "kanban" ? "kanban" : "table";

  const [departments, staff, crossDepartmentTasks] = await Promise.all([listDepartmentOptions(), listUserOptions(), listCrossDepartmentAssignedTasks()]);
  const canCreate = hasPermission(user, "tasks.create");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tasks"
        description="Follow-ups and action items across the organization."
        actions={
          <div className="flex items-center gap-2">
            {hasPermission(user, "tasks.assign") && <CheckOverdueTasksButton />}
            {canCreate && <TaskFormSheet mode="create" staff={staff} departments={departments} />}
          </div>
        }
      />

      <CrossDepartmentTasksPanel tasks={crossDepartmentTasks} />

      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <TaskFilters view={view} />

        {view === "kanban" ? <KanbanSection q={q} priority={priority} /> : <TableSection q={q} status={status} priority={priority} page={page} />}
      </div>
    </div>
  );
}

async function TableSection({ q, status, priority, page }: { q?: string; status?: TaskStatus; priority?: TaskPriority; page: number }) {
  const { data: tasks, total, pageCount } = await listTasks({ q, status, priority, page });

  if (tasks.length === 0) {
    return <EmptyState icon={CheckSquare} title="No tasks found" description="Try adjusting your filters, or add a new task." />;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Assigned to</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell>
                <Link href={`/tasks/${task.id}`} className="hover:text-primary">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">{task.code}</p>
                </Link>
              </TableCell>
              <TableCell>
                <StatusBadge status={task.priority} />
              </TableCell>
              <TableCell>
                <StatusBadge status={task.status} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}</TableCell>
              <TableCell>
                {task.assignee ? (
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Avatar className="size-6">
                      <AvatarFallback className="text-[10px]">{initials(task.assignee.firstName, task.assignee.lastName)}</AvatarFallback>
                    </Avatar>
                    {task.assignee.firstName} {task.assignee.lastName}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">Unassigned</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination page={page} pageCount={pageCount} total={total} />
    </>
  );
}

async function KanbanSection({ q, priority }: { q?: string; priority?: TaskPriority }) {
  const tasks = await listTasksForBoard();
  const filtered = tasks.filter((task) => {
    if (priority && task.priority !== priority) return false;
    if (q && !task.title.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <TaskKanban
      tasks={filtered.map((task) => ({
        id: task.id,
        code: task.code,
        title: task.title,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate,
        assignee: task.assignee,
      }))}
    />
  );
}
