"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { createOpportunityAction, type OpportunityFormState } from "@/app/(app)/leads/actions";

const initialState: OpportunityFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Create opportunity
    </Button>
  );
}

export function CreateOpportunityDialog({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);
  const action = createOpportunityAction.bind(null, leadId);
  const [state, formAction] = useActionState(action, initialState);

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-3.5" /> Add opportunity
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>Add opportunity</DialogTitle>
            <DialogDescription>Track a potential deal value tied to this lead.</DialogDescription>
          </DialogHeader>

          {state.error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" placeholder="e.g. 2BR unit, Kilimani Heights" aria-invalid={!!state.fieldErrors?.title} />
            {state.fieldErrors?.title && <p className="text-xs text-destructive">{state.fieldErrors.title[0]}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="value">Value (KES)</Label>
              <Input id="value" name="value" type="number" min={0} step="1" defaultValue={0} aria-invalid={!!state.fieldErrors?.value} />
              {state.fieldErrors?.value && <p className="text-xs text-destructive">{state.fieldErrors.value[0]}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="probability">Probability (%)</Label>
              <Input id="probability" name="probability" type="number" min={0} max={100} defaultValue={20} aria-invalid={!!state.fieldErrors?.probability} />
              {state.fieldErrors?.probability && <p className="text-xs text-destructive">{state.fieldErrors.probability[0]}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expectedCloseDate">Expected close date</Label>
            <Input id="expectedCloseDate" name="expectedCloseDate" type="date" />
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
