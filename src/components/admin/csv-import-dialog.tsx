"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Upload, Download, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import type { ImportFormState } from "@/lib/validation/import";

const initialState: ImportFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      <Upload className="size-3.5" /> Import
    </Button>
  );
}

/**
 * Generic bulk-CSV-import dialog. `action` must be a bound Server Action
 * reference that reads the "file" field from FormData, parses it, and
 * returns an ImportFormState with a per-row result summary.
 */
export function CsvImportDialog({
  title,
  description,
  templateHeaders,
  templateExample,
  action,
}: {
  title: string;
  description: string;
  templateHeaders: string[];
  templateExample: string[][];
  action: (prevState: ImportFormState, formData: FormData) => Promise<ImportFormState>;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.result) formRef.current?.reset();
  }, [state]);

  function downloadTemplate() {
    const escape = (v: string) => (v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);
    const csv = [templateHeaders, ...templateExample].map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}-template.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="size-3.5" /> Bulk import
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form ref={formRef} action={formAction} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="size-3.5" /> Download CSV template
          </Button>

          {state.error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
          )}

          {state.result && (
            <div className="space-y-2 rounded-md border border-border p-3 text-sm">
              <p className="flex items-center gap-1.5 font-medium text-success">
                <CheckCircle2 className="size-4" /> {state.result.successCount} row(s) imported successfully
              </p>
              {state.result.errors.length > 0 && (
                <div>
                  <p className="flex items-center gap-1.5 font-medium text-destructive">
                    <AlertTriangle className="size-4" /> {state.result.errors.length} row(s) failed
                  </p>
                  <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                    {state.result.errors.map((e) => (
                      <li key={e.row}>
                        Row {e.row}: {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="file">CSV file</Label>
            <input
              id="file"
              name="file"
              type="file"
              required
              accept=".csv,text/csv"
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
            />
            <p className="text-xs text-muted-foreground">Columns matching the template header names are matched by name; extra columns are ignored.</p>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Close
              </Button>
            </DialogClose>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
