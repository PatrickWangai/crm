"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createWorkflowAction, updateWorkflowAction } from "@/app/(app)/admin/workflows/actions";
import { WORKFLOW_TRIGGER_TYPES, type WorkflowFormState } from "@/lib/validation/workflow";
import type { Option } from "@/components/admin/users/user-form-sheet";

const initialState: WorkflowFormState = {};

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {mode === "create" ? "Create automation" : "Save changes"}
    </Button>
  );
}

export interface WorkflowDefaults {
  name: string;
  description: string | null;
  triggerType: string;
  businessUnitId: string | null;
  isActive: boolean;
}

export function WorkflowFormSheet({
  mode,
  workflowId,
  businessUnits,
  defaultValues,
}: {
  mode: "create" | "edit";
  workflowId?: string;
  businessUnits: Option[];
  defaultValues?: WorkflowDefaults;
}) {
  const [open, setOpen] = useState(false);
  const action = mode === "create" ? createWorkflowAction : updateWorkflowAction.bind(null, workflowId!);
  const [state, formAction] = useActionState(action, initialState);
  const [triggerType, setTriggerType] = useState(defaultValues?.triggerType ?? WORKFLOW_TRIGGER_TYPES[0].value);
  const [businessUnitId, setBusinessUnitId] = useState(defaultValues?.businessUnitId ?? "");
  const [isActive, setIsActive] = useState(defaultValues?.isActive ?? true);

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size={mode === "create" ? "default" : "icon"} variant={mode === "create" ? "default" : "ghost"}>
          {mode === "create" ? (
            <>
              <Plus /> Add automation
            </>
          ) : (
            <Pencil className="size-4" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <form action={formAction} className="flex flex-1 flex-col overflow-hidden" noValidate>
          <SheetHeader>
            <SheetTitle>{mode === "create" ? "Add automation" : "Edit automation"}</SheetTitle>
            <SheetDescription>Controls whether the matching &quot;Check ...&quot; trigger on its module page flags records and notifies staff.</SheetDescription>
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
              <Label htmlFor="description">Description (optional)</Label>
              <Input id="description" name="description" defaultValue={defaultValues?.description ?? ""} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="triggerType">Trigger</Label>
              <input type="hidden" name="triggerType" value={triggerType} />
              <Select value={triggerType} onValueChange={setTriggerType}>
                <SelectTrigger id="triggerType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKFLOW_TRIGGER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="businessUnitId">Business unit</Label>
              <input type="hidden" name="businessUnitId" value={businessUnitId} />
              <Select value={businessUnitId} onValueChange={setBusinessUnitId}>
                <SelectTrigger id="businessUnitId">
                  <SelectValue placeholder="All business units" />
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

            <label className="flex items-center gap-2 text-sm">
              <input type="hidden" name="isActive" value={isActive ? "true" : "false"} />
              <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} />
              <span>Active</span>
            </label>
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
