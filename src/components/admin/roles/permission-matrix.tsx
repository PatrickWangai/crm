"use client";

import { useMemo, useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toggleRolePermissionAction } from "@/app/(app)/admin/roles/actions";

export interface PermissionRow {
  id: string;
  code: string;
  module: string;
  action: string;
  description: string | null;
}

export function PermissionMatrix({
  roleId,
  permissions,
  initialGrantedIds,
}: {
  roleId: string;
  permissions: PermissionRow[];
  initialGrantedIds: string[];
}) {
  const [granted, setGranted] = useState(new Set(initialGrantedIds));
  const [, startTransition] = useTransition();

  const grouped = useMemo(() => {
    const map = new Map<string, PermissionRow[]>();
    for (const perm of permissions) {
      const list = map.get(perm.module) ?? [];
      list.push(perm);
      map.set(perm.module, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  function toggle(permissionId: string, next: boolean) {
    setGranted((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(permissionId);
      else copy.delete(permissionId);
      return copy;
    });
    startTransition(() => toggleRolePermissionAction(roleId, permissionId, next));
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {grouped.map(([module, perms]) => (
        <div key={module} className="rounded-lg border border-border p-4">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {module.replace(/_/g, " ")}
          </p>
          <div className="space-y-2.5">
            {perms.map((perm) => (
              <div key={perm.id} className="flex items-start gap-2.5">
                <Checkbox
                  id={perm.id}
                  checked={granted.has(perm.id)}
                  onCheckedChange={(checked) => toggle(perm.id, checked === true)}
                  className="mt-0.5"
                />
                <Label htmlFor={perm.id} className="flex-1 cursor-pointer text-sm font-normal leading-snug">
                  <span className="font-medium capitalize">{perm.action.replace(/_/g, " ")}</span>
                  {perm.description && <span className="block text-xs text-muted-foreground">{perm.description}</span>}
                </Label>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
