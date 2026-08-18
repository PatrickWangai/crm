import Link from "next/link";
import { CheckSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { TaskFormSheet } from "@/components/tasks/task-form-sheet";
import type { TaskFormState } from "@/lib/validation/task";
import type { Option } from "@/components/admin/users/user-form-sheet";

export interface RelatedTask {
  id: string;
  code: string;
  title: string;
  priority: string;
  status: string;
  dueDate: string | Date | null;
  assignee: { firstName: string; lastName: string } | null;
}

/**
 * Shared "Tasks" tab content for stakeholder/lead/ticket detail pages.
 * `createAction` must be a bound Server Action reference (e.g.
 * `createStakeholderTaskAction.bind(null, stakeholderId)`).
 */
export function RelatedTaskList({
  tasks,
  canCreate,
  staff,
  departments,
  createAction,
}: {
  tasks: RelatedTask[];
  canCreate: boolean;
  staff: Option[];
  departments: Option[];
  createAction: (prevState: TaskFormState, formData: FormData) => Promise<TaskFormState>;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Tasks</CardTitle>
          <CardDescription>Follow-ups and action items related to this record.</CardDescription>
        </div>
        {canCreate && <TaskFormSheet mode="create" staff={staff} departments={departments} action={createAction} />}
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <EmptyState icon={CheckSquare} title="No tasks yet" className="border-none py-8" />
        ) : (
          <ul className="divide-y divide-border">
            {tasks.map((task) => (
              <li key={task.id}>
                <Link href={`/tasks/${task.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-primary">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {task.code}
                      {task.assignee && ` · ${task.assignee.firstName} ${task.assignee.lastName}`}
                      {task.dueDate && ` · Due ${new Date(task.dueDate).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={task.priority} />
                    <StatusBadge status={task.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
