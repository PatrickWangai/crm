"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TICKET_CATEGORIES } from "@/lib/validation/ticket";
import type { CreateTicketFromVisitorInput } from "@/lib/services/live-chat.service";

/** Staff fills in whatever the visitor has shared so far — they may not have given contact details yet, so this asks for them rather than assuming a ticket form's usual inputs are already known. */
export function CreateTicketFromVisitorForm({
  onSubmit,
  onCancel,
  onCreated,
}: {
  onSubmit: (input: CreateTicketFromVisitorInput) => Promise<{ error?: string; ticketNumber?: string }>;
  onCancel: () => void;
  onCreated: (ticketNumber: string) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState<string>("Don't Know");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await onSubmit({ firstName, lastName, email: email || undefined, phone: phone || undefined, category, subject, description });
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.ticketNumber) onCreated(result.ticketNumber);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="visitorFirstName" className="text-xs">
            First name
          </Label>
          <Input id="visitorFirstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="visitorLastName" className="text-xs">
            Last name
          </Label>
          <Input id="visitorLastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="h-8 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="visitorEmail" className="text-xs">
            Email
          </Label>
          <Input id="visitorEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="visitorPhone" className="text-xs">
            Phone
          </Label>
          <Input id="visitorPhone" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-8 text-sm" />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="visitorCategory" className="text-xs">
          Category
        </Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="visitorCategory" className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TICKET_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="visitorSubject" className="text-xs">
          Subject
        </Label>
        <Input id="visitorSubject" value={subject} onChange={(e) => setSubject(e.target.value)} required className="h-8 text-sm" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="visitorDescription" className="text-xs">
          Description
        </Label>
        <textarea
          id="visitorDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          minLength={10}
          rows={3}
          className="w-full rounded-md border border-input bg-card px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending || (!email && !phone)}>
          {pending ? "Creating..." : "Create ticket"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
      {!email && !phone && <p className="text-[11px] text-muted-foreground">Need an email or phone number to follow up.</p>}
    </form>
  );
}
