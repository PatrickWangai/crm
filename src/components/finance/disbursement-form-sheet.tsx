"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createDisbursementAction } from "@/app/(app)/finance/actions";
import type { DisbursementFormState } from "@/lib/validation/finance";
import type { Option } from "@/components/admin/users/user-form-sheet";

const initialState: DisbursementFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Create disbursement
    </Button>
  );
}

export function DisbursementFormSheet({ landlords, properties }: { landlords: Option[]; properties: Option[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createDisbursementAction, initialState);
  const [landlordId, setLandlordId] = useState("");
  const [propertyId, setPropertyId] = useState("");

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus /> New disbursement
        </Button>
      </SheetTrigger>
      <SheetContent>
        <form action={formAction} className="flex flex-1 flex-col overflow-hidden" noValidate>
          <SheetHeader>
            <SheetTitle>New landlord disbursement</SheetTitle>
            <SheetDescription>Records rent collected on a landlord&apos;s behalf, ready to be paid out.</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-4">
            {state.error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="landlordId">Landlord</Label>
              <input type="hidden" name="landlordId" value={landlordId} />
              <Select value={landlordId} onValueChange={setLandlordId}>
                <SelectTrigger id="landlordId">
                  <SelectValue placeholder="Select a stakeholder" />
                </SelectTrigger>
                <SelectContent>
                  {landlords.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.fieldErrors?.landlordId && <p className="text-xs text-destructive">{state.fieldErrors.landlordId[0]}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="propertyId">Property (optional)</Label>
              <input type="hidden" name="propertyId" value={propertyId} />
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger id="propertyId">
                  <SelectValue placeholder="Not tied to one property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="periodLabel">Period</Label>
              <Input id="periodLabel" name="periodLabel" placeholder="e.g. August 2026" aria-invalid={!!state.fieldErrors?.periodLabel} />
              {state.fieldErrors?.periodLabel && <p className="text-xs text-destructive">{state.fieldErrors.periodLabel[0]}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount (KES)</Label>
              <Input id="amount" name="amount" type="number" min={0} step="1" defaultValue={0} aria-invalid={!!state.fieldErrors?.amount} />
              {state.fieldErrors?.amount && <p className="text-xs text-destructive">{state.fieldErrors.amount[0]}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input id="notes" name="notes" placeholder="e.g. Net of 10% management fee" />
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
