"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createMaintenanceAction } from "@/app/(app)/maintenance/actions";
import { TICKET_PRIORITIES } from "@/lib/validation/ticket";
import type { MaintenanceFormState } from "@/lib/validation/maintenance";
import type { Option } from "@/components/admin/users/user-form-sheet";

const initialState: MaintenanceFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Log job card
    </Button>
  );
}

export function MaintenanceFormSheet({ properties, units, staff }: { properties: Option[]; units: Option[]; staff: Option[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createMaintenanceAction, initialState);
  const [propertyId, setPropertyId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [assignedToId, setAssignedToId] = useState("");

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus /> Log job card
        </Button>
      </SheetTrigger>
      <SheetContent>
        <form action={formAction} className="flex flex-1 flex-col overflow-hidden" noValidate>
          <SheetHeader>
            <SheetTitle>Log job card</SheetTitle>
            <SheetDescription>Record a maintenance issue for a property or unit.</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-4">
            {state.error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="propertyId">Property</Label>
              <input type="hidden" name="propertyId" value={propertyId} />
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger id="propertyId">
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.fieldErrors?.propertyId && <p className="text-xs text-destructive">{state.fieldErrors.propertyId[0]}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unitId">Unit (optional)</Label>
              <input type="hidden" name="unitId" value={unitId} />
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger id="unitId">
                  <SelectValue placeholder="Whole property" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="issueDescription">Issue</Label>
              <textarea
                id="issueDescription"
                name="issueDescription"
                rows={3}
                placeholder="Describe the issue that needs attention..."
                className="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {state.fieldErrors?.issueDescription && <p className="text-xs text-destructive">{state.fieldErrors.issueDescription[0]}</p>}
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

            <div className="space-y-1.5">
              <Label htmlFor="expectedCompletionDate">Expected completion</Label>
              <Input id="expectedCompletionDate" name="expectedCompletionDate" type="date" />
            </div>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton />
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
