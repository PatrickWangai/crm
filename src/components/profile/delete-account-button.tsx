"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { deleteOwnAccountAction, type SimpleActionState } from "@/app/(app)/profile/actions";

const initialState: SimpleActionState = {};

export function DeleteAccountButton({ eligible }: { eligible: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(deleteOwnAccountAction, initialState);

  if (!eligible) {
    return <p className="text-sm text-muted-foreground">You&apos;ll be able to deactivate your own account here once a successor has accepted a hand-off request above.</p>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="gap-2">
          <Trash2 className="size-4" /> Deactivate my account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deactivate your account?</DialogTitle>
          <DialogDescription>
            Your successor has already accepted your hand-off, so everything that was assigned to you has moved to them. This deactivates your login —
            you&apos;ll be signed out immediately and won&apos;t be able to sign back in. ICT can reactivate your account later if needed.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          {state.error && <p className="mb-3 text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Deactivating..." : "Yes, deactivate my account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
