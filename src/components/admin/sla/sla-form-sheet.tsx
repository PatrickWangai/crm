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
import { createSLAAction, updateSLAAction } from "@/app/(app)/admin/sla/actions";
import { TICKET_PRIORITIES } from "@/lib/validation/ticket";
import type { SlaFormState } from "@/lib/validation/sla";
import type { Option } from "@/components/admin/users/user-form-sheet";

const initialState: SlaFormState = {};

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {mode === "create" ? "Create policy" : "Save changes"}
    </Button>
  );
}

export interface SlaDefaults {
  name: string;
  businessUnitId: string | null;
  category: string | null;
  priority: string;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  isActive: boolean;
}

export function SlaFormSheet({
  mode,
  slaId,
  businessUnits,
  defaultValues,
  trigger,
}: {
  mode: "create" | "edit";
  slaId?: string;
  businessUnits: Option[];
  defaultValues?: SlaDefaults;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const action = mode === "create" ? createSLAAction : updateSLAAction.bind(null, slaId!);
  const [state, formAction] = useActionState(action, initialState);
  const [businessUnitId, setBusinessUnitId] = useState(defaultValues?.businessUnitId ?? "");
  const [priority, setPriority] = useState(defaultValues?.priority ?? "MEDIUM");
  const [isActive, setIsActive] = useState(defaultValues?.isActive ?? true);

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
                <Plus /> Add SLA policy
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
            <SheetTitle>{mode === "create" ? "Add SLA policy" : "Edit SLA policy"}</SheetTitle>
            <SheetDescription>Defines the response and resolution targets for tickets of a given priority.</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-4">
            {state.error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name">Policy name</Label>
              <Input id="name" name="name" defaultValue={defaultValues?.name} aria-invalid={!!state.fieldErrors?.name} />
              {state.fieldErrors?.name && <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="priority">Applies to priority</Label>
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

            <div className="space-y-1.5">
              <Label htmlFor="businessUnitId">Business unit</Label>
              <input type="hidden" name="businessUnitId" value={businessUnitId} />
              <Select value={businessUnitId} onValueChange={setBusinessUnitId}>
                <SelectTrigger id="businessUnitId">
                  <SelectValue placeholder="Global (all business units)" />
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
              <Label htmlFor="category">Category (optional)</Label>
              <Input id="category" name="category" defaultValue={defaultValues?.category ?? ""} placeholder="e.g. Billing Inquiry" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="responseTimeMinutes">Response time (min)</Label>
                <Input
                  id="responseTimeMinutes"
                  name="responseTimeMinutes"
                  type="number"
                  min={1}
                  defaultValue={defaultValues?.responseTimeMinutes ?? 60}
                  aria-invalid={!!state.fieldErrors?.responseTimeMinutes}
                />
                {state.fieldErrors?.responseTimeMinutes && <p className="text-xs text-destructive">{state.fieldErrors.responseTimeMinutes[0]}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="resolutionTimeMinutes">Resolution time (min)</Label>
                <Input
                  id="resolutionTimeMinutes"
                  name="resolutionTimeMinutes"
                  type="number"
                  min={1}
                  defaultValue={defaultValues?.resolutionTimeMinutes ?? 480}
                  aria-invalid={!!state.fieldErrors?.resolutionTimeMinutes}
                />
                {state.fieldErrors?.resolutionTimeMinutes && (
                  <p className="text-xs text-destructive">{state.fieldErrors.resolutionTimeMinutes[0]}</p>
                )}
              </div>
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
