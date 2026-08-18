"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { createInvoiceAction } from "@/app/(app)/finance/actions";
import type { InvoiceFormState } from "@/lib/validation/finance";

const initialState: InvoiceFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Create invoice
    </Button>
  );
}

export function LeaseInvoiceDialog({ leaseId, stakeholderId, defaultAmount }: { leaseId: string; stakeholderId: string; defaultAmount: number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createInvoiceAction, initialState);

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-3.5" /> New invoice
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4" noValidate>
          <input type="hidden" name="stakeholderId" value={stakeholderId} />
          <input type="hidden" name="leaseId" value={leaseId} />
          <DialogHeader>
            <DialogTitle>New invoice</DialogTitle>
            <DialogDescription>Bill the tenant on this lease, e.g. for monthly rent.</DialogDescription>
          </DialogHeader>

          {state.error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount (KES)</Label>
            <Input id="amount" name="amount" type="number" min={0} step="1" defaultValue={defaultAmount} aria-invalid={!!state.fieldErrors?.amount} />
            {state.fieldErrors?.amount && <p className="text-xs text-destructive">{state.fieldErrors.amount[0]}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dueDate">Due date</Label>
            <Input id="dueDate" name="dueDate" type="date" aria-invalid={!!state.fieldErrors?.dueDate} />
            {state.fieldErrors?.dueDate && <p className="text-xs text-destructive">{state.fieldErrors.dueDate[0]}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
