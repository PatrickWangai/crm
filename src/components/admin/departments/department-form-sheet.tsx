"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createDepartmentAction, updateDepartmentAction, type DepartmentFormState } from "@/app/(app)/admin/departments/actions";
import type { Option } from "@/components/admin/users/user-form-sheet";

const initialState: DepartmentFormState = {};

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {mode === "create" ? "Create department" : "Save changes"}
    </Button>
  );
}

export function DepartmentFormSheet({
  mode,
  departmentId,
  businessUnits,
  defaultValues,
}: {
  mode: "create" | "edit";
  departmentId?: string;
  businessUnits: Option[];
  defaultValues?: { name: string; code: string; businessUnitId: string | null };
}) {
  const [open, setOpen] = useState(false);
  const action = mode === "create" ? createDepartmentAction : updateDepartmentAction.bind(null, departmentId!);
  const [state, formAction] = useActionState(action, initialState);
  const [businessUnitId, setBusinessUnitId] = useState(defaultValues?.businessUnitId ?? "");

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {mode === "create" ? (
          <Button>
            <Plus /> Add department
          </Button>
        ) : (
          <Button variant="ghost" size="icon">
            <Pencil className="size-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <form action={formAction} className="flex flex-1 flex-col overflow-hidden" noValidate>
          <SheetHeader>
            <SheetTitle>{mode === "create" ? "Add department" : "Edit department"}</SheetTitle>
            <SheetDescription>Departments group staff for task routing, tickets and reporting.</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-4">
            {state.error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={defaultValues?.name} aria-invalid={!!state.fieldErrors?.name} />
              {state.fieldErrors?.name && <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="code">Code</Label>
              <Input id="code" name="code" placeholder="e.g. LEGAL" defaultValue={defaultValues?.code} aria-invalid={!!state.fieldErrors?.code} />
              {state.fieldErrors?.code && <p className="text-xs text-destructive">{state.fieldErrors.code[0]}</p>}
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
