"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createLeaseAction } from "@/app/(app)/leases/actions";
import type { LeaseFormState } from "@/lib/validation/lease";
import type { Option } from "@/components/admin/users/user-form-sheet";

const initialState: LeaseFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Create lease
    </Button>
  );
}

export function LeaseFormSheet({
  units,
  tenants,
  landlords,
  fixedUnitId,
  trigger,
}: {
  units: Option[];
  tenants: Option[];
  landlords: Option[];
  fixedUnitId?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createLeaseAction, initialState);
  const [unitId, setUnitId] = useState(fixedUnitId ?? "");
  const [tenantId, setTenantId] = useState("");
  const [landlordId, setLandlordId] = useState("");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus /> New lease
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <form action={formAction} className="flex flex-1 flex-col overflow-hidden" noValidate>
          <SheetHeader>
            <SheetTitle>New lease</SheetTitle>
            <SheetDescription>Assigns a tenant to a unit for a fixed term.</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-4">
            {state.error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
            )}

            {!fixedUnitId && (
              <div className="space-y-1.5">
                <Label htmlFor="unitId">Unit</Label>
                <input type="hidden" name="unitId" value={unitId} />
                <Select value={unitId} onValueChange={setUnitId}>
                  <SelectTrigger id="unitId">
                    <SelectValue placeholder="Select a vacant unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {state.fieldErrors?.unitId && <p className="text-xs text-destructive">{state.fieldErrors.unitId[0]}</p>}
              </div>
            )}
            {fixedUnitId && <input type="hidden" name="unitId" value={fixedUnitId} />}

            <div className="space-y-1.5">
              <Label htmlFor="tenantId">Tenant</Label>
              <input type="hidden" name="tenantId" value={tenantId} />
              <Select value={tenantId} onValueChange={setTenantId}>
                <SelectTrigger id="tenantId">
                  <SelectValue placeholder="Select a stakeholder" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.fieldErrors?.tenantId && <p className="text-xs text-destructive">{state.fieldErrors.tenantId[0]}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="landlordId">Landlord</Label>
              <input type="hidden" name="landlordId" value={landlordId} />
              <Select value={landlordId} onValueChange={setLandlordId}>
                <SelectTrigger id="landlordId">
                  <SelectValue placeholder="No landlord on file" />
                </SelectTrigger>
                <SelectContent>
                  {landlords.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date" name="startDate" type="date" error={state.fieldErrors?.startDate} />
              <Field label="End date" name="endDate" type="date" error={state.fieldErrors?.endDate} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Rent (KES/mo)" name="rentAmount" type="number" defaultValue="0" error={state.fieldErrors?.rentAmount} />
              <Field label="Deposit (KES)" name="depositAmount" type="number" defaultValue="0" />
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
