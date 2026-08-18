"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { recordPaymentAction } from "@/app/(app)/finance/actions";
import type { PaymentFormState } from "@/lib/validation/finance";

const initialState: PaymentFormState = {};

const METHODS = ["CASH", "BANK_TRANSFER", "MPESA", "CARD", "CHEQUE", "OTHER"] as const;
const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  MPESA: "M-Pesa",
  CARD: "Card",
  CHEQUE: "Cheque",
  OTHER: "Other",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Record payment
    </Button>
  );
}

export function RecordPaymentDialog({ invoiceId, invoiceNumber, balance }: { invoiceId: string; invoiceNumber: string; balance: number }) {
  const [open, setOpen] = useState(false);
  const action = recordPaymentAction.bind(null, invoiceId);
  const [state, formAction] = useActionState(action, initialState);
  const [method, setMethod] = useState<string>("MPESA");

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Wallet className="size-3.5" /> Record payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              {invoiceNumber} · balance outstanding: {balance.toLocaleString("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 })}
            </DialogDescription>
          </DialogHeader>

          {state.error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount (KES)</Label>
            <Input id="amount" name="amount" type="number" min={0} step="1" defaultValue={balance} aria-invalid={!!state.fieldErrors?.amount} />
            {state.fieldErrors?.amount && <p className="text-xs text-destructive">{state.fieldErrors.amount[0]}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="method">Method</Label>
            <input type="hidden" name="method" value={method} />
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger id="method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reference">Reference (optional)</Label>
            <Input id="reference" name="reference" placeholder="e.g. M-Pesa code" />
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
