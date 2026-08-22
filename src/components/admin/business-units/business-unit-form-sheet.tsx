"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { createBusinessUnitAction, type BusinessUnitFormState } from "@/app/(app)/admin/business-units/actions";

const initialState: BusinessUnitFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Create business unit
    </Button>
  );
}

/** Creating a business unit here is what makes it appear on the customer-facing "Which service is this about?" pickers (both the CRM's own /help page and the standalone customer app, which reads the live list over the API bridge) — no deploy needed. */
export function BusinessUnitFormSheet() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createBusinessUnitAction, initialState);

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus /> Add business unit
        </Button>
      </SheetTrigger>
      <SheetContent>
        <form action={formAction} className="flex flex-1 flex-col overflow-hidden" noValidate>
          <SheetHeader>
            <SheetTitle>Add business unit</SheetTitle>
            <SheetDescription>Appears immediately on every customer-facing &ldquo;which service is this about?&rdquo; picker.</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-4">
            {state.error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="e.g. Masterways Logistics" aria-invalid={!!state.fieldErrors?.name} />
              {state.fieldErrors?.name && <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="code">Code</Label>
              <Input id="code" name="code" placeholder="e.g. MLG" aria-invalid={!!state.fieldErrors?.code} />
              {state.fieldErrors?.code && <p className="text-xs text-destructive">{state.fieldErrors.code[0]}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" aria-invalid={!!state.fieldErrors?.description} />
              {state.fieldErrors?.description && <p className="text-xs text-destructive">{state.fieldErrors.description[0]}</p>}
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
