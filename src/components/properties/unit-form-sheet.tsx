"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createUnitAction, updateUnitAction } from "@/app/(app)/properties/actions";
import { UNIT_TYPES, UNIT_STATUSES, type UnitFormState } from "@/lib/validation/unit";

const initialState: UnitFormState = {};

const STATUS_LABELS: Record<string, string> = {
  OCCUPIED: "Occupied",
  VACANT: "Vacant",
  RESERVED: "Reserved",
  UNDER_MAINTENANCE: "Under Maintenance",
};

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {mode === "create" ? "Add unit" : "Save changes"}
    </Button>
  );
}

export interface UnitDefaults {
  unitNumber: string;
  unitType: string;
  floor: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sizeSqm: number | null;
  rentAmount: number;
  status: string;
}

export function UnitFormSheet({
  mode,
  propertyId,
  unitId,
  defaultValues,
  trigger,
}: {
  mode: "create" | "edit";
  propertyId: string;
  unitId?: string;
  defaultValues?: UnitDefaults;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const action = mode === "create" ? createUnitAction.bind(null, propertyId) : updateUnitAction.bind(null, unitId!, propertyId);
  const [state, formAction] = useActionState(action, initialState);
  const [unitType, setUnitType] = useState(defaultValues?.unitType ?? UNIT_TYPES[0]);
  const [status, setStatus] = useState(defaultValues?.status ?? "VACANT");

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
                <Plus /> Add unit
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
            <SheetTitle>{mode === "create" ? "Add unit" : "Edit unit"}</SheetTitle>
            <SheetDescription>Units are the individually leasable spaces within a property.</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-4">
            {state.error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Unit number" name="unitNumber" error={state.fieldErrors?.unitNumber} defaultValue={defaultValues?.unitNumber} />
              <Field label="Floor" name="floor" defaultValue={defaultValues?.floor ?? ""} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unitType">Unit type</Label>
              <input type="hidden" name="unitType" value={unitType} />
              <Select value={unitType} onValueChange={setUnitType}>
                <SelectTrigger id="unitType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Bedrooms" name="bedrooms" type="number" defaultValue={defaultValues?.bedrooms?.toString() ?? ""} />
              <Field label="Bathrooms" name="bathrooms" type="number" defaultValue={defaultValues?.bathrooms?.toString() ?? ""} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Size (sqm)" name="sizeSqm" type="number" defaultValue={defaultValues?.sizeSqm?.toString() ?? ""} />
              <Field
                label="Rent (KES/mo)"
                name="rentAmount"
                type="number"
                error={state.fieldErrors?.rentAmount}
                defaultValue={defaultValues?.rentAmount?.toString() ?? "0"}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <input type="hidden" name="status" value={status} />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
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

function Field({
  label,
  name,
  type = "text",
  error,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  error?: string[];
  defaultValue?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} aria-invalid={!!error} />
      {error && <p className="text-xs text-destructive">{error[0]}</p>}
    </div>
  );
}
