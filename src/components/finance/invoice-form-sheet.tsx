"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createInvoiceAction } from "@/app/(app)/finance/actions";
import type { InvoiceFormState } from "@/lib/validation/finance";
import type { Option } from "@/components/admin/users/user-form-sheet";

const initialState: InvoiceFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Create invoice
    </Button>
  );
}

export function InvoiceFormSheet({ stakeholders, leases, businessUnits }: { stakeholders: Option[]; leases: Option[]; businessUnits: Option[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createInvoiceAction, initialState);
  const [stakeholderId, setStakeholderId] = useState("");
  const [leaseId, setLeaseId] = useState("");
  const [businessUnitId, setBusinessUnitId] = useState("");

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus /> New invoice
        </Button>
      </SheetTrigger>
      <SheetContent>
        <form action={formAction} className="flex flex-1 flex-col overflow-hidden" noValidate>
          <SheetHeader>
            <SheetTitle>New invoice</SheetTitle>
            <SheetDescription>Bill a stakeholder, optionally linked to a lease.</SheetDescription>
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

            <div className="space-y-1.5">
              <Label htmlFor="leaseId">Lease (optional)</Label>
              <input type="hidden" name="leaseId" value={leaseId} />
              <Select value={leaseId} onValueChange={setLeaseId}>
                <SelectTrigger id="leaseId">
                  <SelectValue placeholder="Not tied to a lease" />
                </SelectTrigger>
                <SelectContent>
                  {leases.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
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
              <Label htmlFor="amount">Amount (KES)</Label>
              <Input id="amount" name="amount" type="number" min={0} step="1" defaultValue={0} aria-invalid={!!state.fieldErrors?.amount} />
              {state.fieldErrors?.amount && <p className="text-xs text-destructive">{state.fieldErrors.amount[0]}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Due date</Label>
              <Input id="dueDate" name="dueDate" type="date" aria-invalid={!!state.fieldErrors?.dueDate} />
              {state.fieldErrors?.dueDate && <p className="text-xs text-destructive">{state.fieldErrors.dueDate[0]}</p>}
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
