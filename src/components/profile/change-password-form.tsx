"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordAction, type PasswordFormState } from "@/app/(app)/profile/actions";

const initialState: PasswordFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      <KeyRound /> Update password
    </Button>
  );
}

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4" noValidate>
      {state.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
      )}
      {state.success && (
        <div className="rounded-md border border-success/30 bg-success-muted px-3 py-2 text-sm text-success">
          Password updated successfully.
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" />
        {state.fieldErrors?.currentPassword && <p className="text-xs text-destructive">{state.fieldErrors.currentPassword[0]}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="newPassword">New password</Label>
          <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" />
          {state.fieldErrors?.newPassword && <p className="text-xs text-destructive">{state.fieldErrors.newPassword[0]}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" />
          {state.fieldErrors?.confirmPassword && <p className="text-xs text-destructive">{state.fieldErrors.confirmPassword[0]}</p>}
        </div>
      </div>
      <SubmitButton />
    </form>
  );
}
