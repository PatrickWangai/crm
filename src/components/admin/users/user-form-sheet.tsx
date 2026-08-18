"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Pencil, KeyRound, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createUserAction, updateUserAction, type UserFormState } from "@/app/(app)/admin/users/actions";

export interface Option {
  id: string;
  name: string;
}

interface UserFormSheetProps {
  mode: "create" | "edit";
  userId?: string;
  roles: Option[];
  departments: Option[];
  businessUnits: Option[];
  managers: Option[];
  defaultValues?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    jobTitle: string | null;
    roleId: string;
    departmentId: string | null;
    businessUnitId: string | null;
    reportingToId: string | null;
  };
  trigger?: React.ReactNode;
}

const initialState: UserFormState = {};

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {mode === "create" ? "Create user" : "Save changes"}
    </Button>
  );
}

export function UserFormSheet({ mode, userId, roles, departments, businessUnits, managers, defaultValues, trigger }: UserFormSheetProps) {
  const [open, setOpen] = useState(false);
  const action = mode === "create" ? createUserAction : updateUserAction.bind(null, userId!);
  const [state, formAction] = useActionState(action, initialState);
  const [copied, setCopied] = useState(false);

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.success && !state.tempPassword) setOpen(false);
  }

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) setCopied(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button size={mode === "create" ? "default" : "icon"} variant={mode === "create" ? "default" : "ghost"}>
            {mode === "create" ? (
              <>
                <Plus /> Add user
              </>
            ) : (
              <Pencil className="size-4" />
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        {state.tempPassword ? (
          <>
            <SheetHeader>
              <SheetTitle>User created</SheetTitle>
              <SheetDescription>Share this temporary password securely — it won&apos;t be shown again.</SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary/50 px-4 py-3">
                <div className="flex items-center gap-2 font-mono text-sm">
                  <KeyRound className="size-4 text-muted-foreground" />
                  {state.tempPassword}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(state.tempPassword!);
                    setCopied(true);
                  }}
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The user should sign in and change this password from their profile as soon as possible.
              </p>
            </SheetBody>
            <SheetFooter>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </SheetFooter>
          </>
        ) : (
          <form action={formAction} className="flex flex-1 flex-col overflow-hidden" noValidate>
            <SheetHeader>
              <SheetTitle>{mode === "create" ? "Add user" : "Edit user"}</SheetTitle>
              <SheetDescription>
                {mode === "create"
                  ? "Create a new CRM user account with a role and department assignment."
                  : "Update this user's details, role and reporting line."}
              </SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-4">
              {state.error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {state.error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field label="First name" name="firstName" error={state.fieldErrors?.firstName} defaultValue={defaultValues?.firstName} />
                <Field label="Last name" name="lastName" error={state.fieldErrors?.lastName} defaultValue={defaultValues?.lastName} />
              </div>
              <Field label="Email" name="email" type="email" error={state.fieldErrors?.email} defaultValue={defaultValues?.email} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone" name="phone" error={state.fieldErrors?.phone} defaultValue={defaultValues?.phone ?? ""} />
                <Field label="Job title" name="jobTitle" error={state.fieldErrors?.jobTitle} defaultValue={defaultValues?.jobTitle ?? ""} />
              </div>

              <SelectField label="Role" name="roleId" options={roles} defaultValue={defaultValues?.roleId} error={state.fieldErrors?.roleId} required />
              <SelectField label="Department" name="departmentId" options={departments} defaultValue={defaultValues?.departmentId ?? undefined} placeholder="No department" />
              <SelectField label="Business unit" name="businessUnitId" options={businessUnits} defaultValue={defaultValues?.businessUnitId ?? undefined} placeholder="No business unit" />
              <SelectField label="Reports to" name="reportingToId" options={managers} defaultValue={defaultValues?.reportingToId ?? undefined} placeholder="No manager" />
            </SheetBody>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <SubmitButton mode={mode} />
            </SheetFooter>
          </form>
        )}
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

function SelectField({
  label,
  name,
  options,
  defaultValue,
  error,
  placeholder = "Select...",
  required,
}: {
  label: string;
  name: string;
  options: Option[];
  defaultValue?: string;
  error?: string[];
  placeholder?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <input type="hidden" name={name} value={value} />
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger id={name} aria-invalid={!!error}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.id} value={opt.id}>
              {opt.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error[0]}</p>}
    </div>
  );
}
