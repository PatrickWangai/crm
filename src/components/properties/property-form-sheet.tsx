"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPropertyAction, updatePropertyAction } from "@/app/(app)/properties/actions";
import { PROPERTY_TYPES, type PropertyFormState } from "@/lib/validation/property";
import type { Option } from "@/components/admin/users/user-form-sheet";

const initialState: PropertyFormState = {};

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {mode === "create" ? "Create property" : "Save changes"}
    </Button>
  );
}

export interface PropertyDefaults {
  name: string;
  propertyType: string;
  address: string | null;
  city: string | null;
  region: string | null;
  businessUnitId: string | null;
  landlordId: string | null;
}

export function PropertyFormSheet({
  mode,
  propertyId,
  businessUnits,
  landlords,
  defaultValues,
  redirectOnCreate,
}: {
  mode: "create" | "edit";
  propertyId?: string;
  businessUnits: Option[];
  landlords: Option[];
  defaultValues?: PropertyDefaults;
  redirectOnCreate?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const action = mode === "create" ? createPropertyAction : updatePropertyAction.bind(null, propertyId!);
  const [state, formAction] = useActionState(action, initialState);
  const [propertyType, setPropertyType] = useState(defaultValues?.propertyType ?? PROPERTY_TYPES[0]);
  const [businessUnitId, setBusinessUnitId] = useState(defaultValues?.businessUnitId ?? "");
  const [landlordId, setLandlordId] = useState(defaultValues?.landlordId ?? "");

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setOpen(false);
  }

  useEffect(() => {
    if (state.success && mode === "create" && redirectOnCreate && state.propertyId) {
      router.push(`/properties/${state.propertyId}`);
    }
  }, [state, mode, redirectOnCreate, router]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size={mode === "create" ? "default" : "icon"} variant={mode === "create" ? "default" : "ghost"}>
          {mode === "create" ? (
            <>
              <Plus /> Add property
            </>
          ) : (
            <Pencil className="size-4" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <form action={formAction} className="flex flex-1 flex-col overflow-hidden" noValidate>
          <SheetHeader>
            <SheetTitle>{mode === "create" ? "Add property" : "Edit property"}</SheetTitle>
            <SheetDescription>Properties group units together under one address and landlord.</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-4">
            {state.error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
            )}

            <Field label="Name" name="name" error={state.fieldErrors?.name} defaultValue={defaultValues?.name} />

            <div className="space-y-1.5">
              <Label htmlFor="propertyType">Property type</Label>
              <input type="hidden" name="propertyType" value={propertyType} />
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger id="propertyType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Field label="Address" name="address" error={state.fieldErrors?.address} defaultValue={defaultValues?.address ?? ""} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" name="city" error={state.fieldErrors?.city} defaultValue={defaultValues?.city ?? ""} />
              <Field label="Region" name="region" error={state.fieldErrors?.region} defaultValue={defaultValues?.region ?? ""} />
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

function Field({ label, name, error, defaultValue }: { label: string; name: string; error?: string[]; defaultValue?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} aria-invalid={!!error} />
      {error && <p className="text-xs text-destructive">{error[0]}</p>}
    </div>
  );
}
