"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTaskAction, updateTaskAction } from "@/app/(app)/tasks/actions";
import { TASK_PRIORITIES, type TaskFormState } from "@/lib/validation/task";
import type { Option } from "@/components/admin/users/user-form-sheet";

const initialState: TaskFormState = {};

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {mode === "create" ? "Create task" : "Save changes"}
    </Button>
  );
}

export interface TaskDefaults {
  title: string;
  description: string | null;
  priority: string;
  dueDate: string | null;
  assigneeId: string | null;
  departmentId: string | null;
}

/**
 * `action` lets callers use a differently-scoped create action (e.g. one that
 * relates the new task to a stakeholder/lead/ticket) — must be a bound Server
 * Action reference. Defaults to the general, unrelated createTaskAction.
 */
export function TaskFormSheet({
  mode,
  taskId,
  staff,
  departments,
  defaultValues,
  action,
  trigger,
}: {
  mode: "create" | "edit";
  taskId?: string;
  staff: Option[];
  departments: Option[];
  defaultValues?: TaskDefaults;
  action?: (prevState: TaskFormState, formData: FormData) => Promise<TaskFormState>;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const resolvedAction = action ?? (mode === "create" ? createTaskAction : updateTaskAction.bind(null, taskId!));
  const [state, formAction] = useActionState(resolvedAction, initialState);
  const [priority, setPriority] = useState(defaultValues?.priority ?? "MEDIUM");
  const [assigneeId, setAssigneeId] = useState(defaultValues?.assigneeId ?? "");
  const [departmentId, setDepartmentId] = useState(defaultValues?.departmentId ?? "");

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button size={mode === "create" ? "default" : "icon"} variant={mode === "create" ? "default" : "ghost"}>
            {mode === "create" ? (
              <>
                <Plus /> Add task
              </>
            ) : (
              <Pencil className="size-4" />
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <form action={formAction} className="flex flex-1 flex-col overflow-hidden" noValidate>
          <SheetHeader>
            <SheetTitle>{mode === "create" ? "Add task" : "Edit task"}</SheetTitle>
            <SheetDescription>Follow-ups and action items with an owner and due date.</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-4">
            {state.error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" defaultValue={defaultValues?.title} aria-invalid={!!state.fieldErrors?.title} />
              {state.fieldErrors?.title && <p className="text-xs text-destructive">{state.fieldErrors.title[0]}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={defaultValues?.description ?? ""}
                className="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="priority">Priority</Label>
                <input type="hidden" name="priority" value={priority} />
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p.charAt(0) + p.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Field label="Due date" name="dueDate" type="date" defaultValue={defaultValues?.dueDate ?? ""} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assigneeId">Assign to</Label>
              <input type="hidden" name="assigneeId" value={assigneeId} />
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger id="assigneeId">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="departmentId">Department</Label>
              <input type="hidden" name="departmentId" value={departmentId} />
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger id="departmentId">
                  <SelectValue placeholder="No department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton mode={mode} />
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, name, type = "text", defaultValue }: { label: string; name: string; type?: string; defaultValue?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} />
    </div>
  );
}
