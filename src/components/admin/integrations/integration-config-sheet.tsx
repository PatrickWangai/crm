"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateIntegrationConfigAction } from "@/app/(app)/admin/integrations/actions";
import { INTEGRATION_STATUSES, type IntegrationFormState } from "@/lib/validation/integration";

const initialState: IntegrationFormState = {};

const STATUS_LABELS: Record<string, string> = {
  MOCK: "Mock (interface only)",
  CONNECTED: "Connected",
  DISCONNECTED: "Disconnected",
  ERROR: "Error",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Save changes
    </Button>
  );
}

export function IntegrationConfigSheet({
  integrationId,
  displayName,
  currentStatus,
  currentEndpoint,
}: {
  integrationId: string;
  displayName: string;
  currentStatus: string;
  currentEndpoint: string;
}) {
  const [open, setOpen] = useState(false);
  const action = updateIntegrationConfigAction.bind(null, integrationId);
  const [state, formAction] = useActionState(action, initialState);
  const [status, setStatus] = useState(currentStatus);

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline">
          <Settings className="size-3.5" /> Configure
        </Button>
      </SheetTrigger>
      <SheetContent>
        <form action={formAction} className="flex flex-1 flex-col overflow-hidden" noValidate>
          <SheetHeader>
            <SheetTitle>{displayName}</SheetTitle>
            <SheetDescription>
              No production credentials exist in this environment, so this manages the interface layer only — set status to Connected once real
              credentials are wired in.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-4">
            {state.error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <input type="hidden" name="status" value={status} />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTEGRATION_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="endpoint">Endpoint / notes (optional)</Label>
              <Input id="endpoint" name="endpoint" defaultValue={currentEndpoint} placeholder="e.g. https://sandbox.vendor.example/api" />
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
