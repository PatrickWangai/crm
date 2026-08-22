import Link from "next/link";
import { Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";

interface CrossDepartmentTask {
  id: string;
  code: string;
  title: string;
  priority: string;
  dueDate: Date | null;
  createdBy: { firstName: string; lastName: string; department: { name: string } | null } | null;
}

/**
 * "Tasks assigned from other departments" — a distinct lens from the main
 * Tasks list below: work someone in a *different* department specifically
 * handed you, not something your own team queued up. See
 * listCrossDepartmentAssignedTasks in task.service.ts for how "cross-
 * department" is judged (the creator's department vs. yours, not the
 * task's own free-form departmentId field). Hidden entirely when empty —
 * most people never receive one of these, so an always-visible empty card
 * would just be clutter.
 */
export function CrossDepartmentTasksPanel({ tasks }: { tasks: CrossDepartmentTask[] }) {
  if (tasks.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="size-4 text-primary" /> Assigned to you from other departments
        </CardTitle>
        <CardDescription>Open tasks another department specifically handed you — not something your own team queued up.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.map((task) => (
          <Link
            key={task.id}
            href={`/tasks/${task.id}`}
            className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary/50"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{task.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {task.code}
                {task.createdBy && (
                  <>
                    {" "}
                    · from {task.createdBy.firstName} {task.createdBy.lastName}
                    {task.createdBy.department ? ` (${task.createdBy.department.name})` : ""}
                  </>
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {task.dueDate && <span className="text-xs text-muted-foreground">{new Date(task.dueDate).toLocaleDateString()}</span>}
              <StatusBadge status={task.priority} />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
