"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTicketAction, updateTicketAction } from "@/app/(app)/tickets/actions";
import { TICKET_CATEGORIES, TICKET_PRIORITIES, type TicketFormState } from "@/lib/validation/ticket";
import type { Option } from "@/components/admin/users/user-form-sheet";

const initialState: TicketFormState = {};

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {mode === "create" ? "Create ticket" : "Save changes"}
    </Button>
  );
}

export interface TicketDefaults {
  stakeholderId: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  businessUnitId: string | null;
  departmentId: string | null;
  assignedToId: string | null;
}

export function TicketFormSheet({
  mode,
  ticketId,
  stakeholders,
  businessUnits,
  departments,
  staff,
  defaultValues,
  trigger,
  redirectOnCreate,
}: {
  mode: "create" | "edit";
  ticketId?: string;
  stakeholders: Option[];
  businessUnits: Option[];
  departments: Option[];
  staff: Option[];
  defaultValues?: TicketDefaults;
  trigger?: React.ReactNode;
  redirectOnCreate?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const action = mode === "create" ? createTicketAction : updateTicketAction.bind(null, ticketId!);
  const [state, formAction] = useActionState(action, initialState);
  const [stakeholderId, setStakeholderId] = useState(defaultValues?.stakeholderId ?? "");
  const [category, setCategory] = useState(defaultValues?.category ?? TICKET_CATEGORIES[0]);
  const [priority, setPriority] = useState(defaultValues?.priority ?? "MEDIUM");
  const [businessUnitId, setBusinessUnitId] = useState(defaultValues?.businessUnitId ?? "");
  const [departmentId, setDepartmentId] = useState(defaultValues?.departmentId ?? "");
  const [assignedToId, setAssignedToId] = useState(defaultValues?.assignedToId ?? "");

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setOpen(false);
  }

  useEffect(() => {
    if (state.success && mode === "create" && redirectOnCreate && state.ticketId) {
      router.push(`/tickets/${state.ticketId}`);
    }
  }, [state, mode, redirectOnCreate, router]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button size={mode === "create" ? "default" : "icon"} variant={mode === "create" ? "default" : "ghost"}>
            {mode === "create" ? (
              <>
                <Plus /> Log ticket
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
            <SheetTitle>{mode === "create" ? "Log ticket" : "Edit ticket"}</SheetTitle>
            <SheetDescription>Record a customer service request and route it to the right team.</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-4">
            {state.error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="stakeholderId">Stakeholder</Label>
              <input type="hidden" name="stakeholderId" value={stakeholderId} />
              <Select value={stakeholderId} onValueChange={setStakeholderId}>
                <SelectTrigger id="stakeholderId">
                  <SelectValue placeholder="Select a stakeholder" />
                </SelectTrigger>
                <SelectContent>
                  {stakeholders.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.fieldErrors?.stakeholderId && <p className="text-xs text-destructive">{state.fieldErrors.stakeholderId[0]}</p>}
            </div>

            <Field label="Subject" name="subject" error={state.fieldErrors?.subject} defaultValue={defaultValues?.subject} />

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={defaultValues?.description ?? ""}
                placeholder="What is the customer reporting or requesting?"
                className="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {state.fieldErrors?.description && <p className="text-xs text-destructive">{state.fieldErrors.description[0]}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <input type="hidden" name="category" value={category} />
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="priority">Priority</Label>
                <input type="hidden" name="priority" value={priority} />
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p.charAt(0) + p.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="businessUnitId">Business unit</Label>
              <input type="hidden" name="businessUnitId" value={businessUnitId} />
              <Select value={businessUnitId} onValueChange={setBusinessUnitId}>
                <SelectTrigger id="businessUnitId">
                  <SelectValue placeholder="No business unit" />
                </SelectTrigger>
                <SelectContent>
                  {businessUnits.map((bu) => (
                    <SelectItem key={bu.id} value={bu.id}>
                      {bu.name}
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

            <div className="space-y-1.5">
              <Label htmlFor="assignedToId">Assign to</Label>
              <input type="hidden" name="assignedToId" value={assignedToId} />
              <Select value={assignedToId} onValueChange={setAssignedToId}>
                <SelectTrigger id="assignedToId">
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

function Field({
  label,
  name,
  type = "text",
  error,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  error?: string[];
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} aria-invalid={!!error} />
      {error && <p className="text-xs text-destructive">{error[0]}</p>}
    </div>
  );
}
