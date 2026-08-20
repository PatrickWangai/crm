import { Phone, MessageCircle } from "lucide-react";

/** wa.me needs digits only, country code included, no leading +. */
function toWhatsAppLink(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}

export function QuickContactLinks({ phone }: { phone: string | null }) {
  if (!phone) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={`tel:${phone}`}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
      >
        <Phone className="size-3.5" /> Call {phone}
      </a>
      <a
        href={toWhatsAppLink(phone)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
      >
        <MessageCircle className="size-3.5" /> WhatsApp
      </a>
    </div>
  );
}
