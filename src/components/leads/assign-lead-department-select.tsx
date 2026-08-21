"use client";

import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignLeadToDepartmentAction } from "@/app/(app)/leads/actions";

interface DeptOption {
  id: string;
  name: string;
}

/** Routes a lead to a whole department, not one specific agent — e.g. it turned out to be a Property or SACCO matter, not a Sales one. Only offers customer-facing departments, same set tickets can be forwarded to. */
export function AssignLeadDepartmentSelect({ leadId, departments, currentDepartmentId }: { leadId: string; departments: DeptOption[]; currentDepartmentId: string | null }) {
  const [isPending, startTransition] = useTransition();
  const UNASSIGNED = "__unassigned__";

  return (
    <Select
      value={currentDepartmentId ?? UNASSIGNED}
      disabled={isPending}
      onValueChange={(value) => {
        if (value === UNASSIGNED) return;
        startTransition(async () => {
          await assignLeadToDepartmentAction(leadId, value);
        });
      }}
    >
      <SelectTrigger className="w-56">
        <SelectValue placeholder="No department" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED} disabled>
          No department
        </SelectItem>
        {departments.map((d) => (
          <SelectItem key={d.id} value={d.id}>
            {d.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
