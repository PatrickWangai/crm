"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Pencil, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { updateBusinessUnitAction, type BusinessUnitFormState } from "@/app/(app)/admin/business-units/actions";
import { DeleteBusinessUnitButton } from "@/components/admin/business-units/delete-business-unit-button";

const initialState: BusinessUnitFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending}>
      Save
    </Button>
  );
}

export function BusinessUnitCard({
  id,
  code,
  name,
  description,
  userCount,
  departmentCount,
}: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  userCount: number;
  departmentCount: number;
}) {
  const [editing, setEditing] = useState(false);
  const action = updateBusinessUnitAction.bind(null, id);
  const [state, formAction] = useActionState(action, initialState);

  // Close the inline editor once the action succeeds. Derived during render
  // (rather than a useEffect) to avoid an extra commit purely to sync state.
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setEditing(false);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Landmark className="size-4.5" />
          </div>
          <Badge variant="outline">{code}</Badge>
        </div>
        {!editing && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setEditing(true)}>
              <Pencil className="size-4" />
            </Button>
            <DeleteBusinessUnitButton businessUnitId={id} name={name} userCount={userCount} departmentCount={departmentCount} />
          </div>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <form
            action={(fd) => {
              formAction(fd);
              setEditing(false);
            }}
            className="space-y-3"
          >
            {state.error && <p className="text-xs text-destructive">{state.error}</p>}
            <div className="space-y-1.5">
              <Label htmlFor={`name-${id}`}>Name</Label>
              <Input id={`name-${id}`} name="name" defaultValue={name} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`desc-${id}`}>Description</Label>
              <Input id={`desc-${id}`} name="description" defaultValue={description ?? ""} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <SubmitButton />
            </div>
          </form>
        ) : (
          <>
            <p className="font-semibold">{name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{description || "No description yet."}</p>
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              <span>{userCount} staff</span>
              <span>{departmentCount} departments</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
