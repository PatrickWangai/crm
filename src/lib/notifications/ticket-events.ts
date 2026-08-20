import "server-only";
import { createNotification } from "@/lib/services/notification.service";
import { getTicketWatchers } from "@/lib/services/department-routing";
import { sendEmail } from "@/lib/email/resend";
import { emailShell } from "@/lib/email/templates";

interface WatchedTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  description: string;
}

/**
 * Fires once, right after a new ticket lands (public portal or staff-logged),
 * to everyone whose department the ticket routes to. In-app matches the
 * existing behavior; email is new — see lib/email/resend.ts.
 */
export async function notifyNewRequest(ticket: WatchedTicket, sourceLabel: string) {
  const watchers = await getTicketWatchers(ticket.category, ticket.subject, ticket.description);
  await Promise.all(
    watchers.map(async (w) => {
      await createNotification({
        userId: w.id,
        type: "SYSTEM",
        title: `New request via ${sourceLabel}`,
        message: `${ticket.ticketNumber}: ${ticket.subject}`,
        relatedUrl: `/tickets/${ticket.id}`,
      });
      if (w.email) {
        await sendEmail({
          to: w.email,
          subject: `New request: ${ticket.ticketNumber} — ${ticket.subject}`,
          html: emailShell(
            "A new request just came in",
            `<p style="color:#475467; font-size:14px; line-height:1.5;"><strong>${ticket.ticketNumber}</strong> — ${ticket.subject}<br/>Category: ${ticket.category}<br/>Submitted via ${sourceLabel}.</p>`,
            `/tickets/${ticket.id}`,
            "View ticket",
          ),
        });
      }
    }),
  );
}

/** Fires when a ticket is accepted (self-assigned with a deadline) — tells the rest of the department who's on it, minus the person who just took it. */
export async function notifyTicketAccepted(ticket: WatchedTicket, acceptedBy: { id: string; firstName: string; lastName: string }) {
  const watchers = (await getTicketWatchers(ticket.category, ticket.subject, ticket.description)).filter((w) => w.id !== acceptedBy.id);
  await Promise.all(
    watchers.map(async (w) => {
      await createNotification({
        userId: w.id,
        type: "SYSTEM",
        title: "Ticket accepted",
        message: `${ticket.ticketNumber} was accepted by ${acceptedBy.firstName} ${acceptedBy.lastName}`,
        relatedUrl: `/tickets/${ticket.id}`,
      });
      if (w.email) {
        await sendEmail({
          to: w.email,
          subject: `Assigned: ${ticket.ticketNumber} — ${ticket.subject}`,
          html: emailShell(
            "A request in your department was picked up",
            `<p style="color:#475467; font-size:14px; line-height:1.5;"><strong>${ticket.ticketNumber}</strong> — ${ticket.subject}<br/>Accepted by ${acceptedBy.firstName} ${acceptedBy.lastName}.</p>`,
            `/tickets/${ticket.id}`,
            "View ticket",
          ),
        });
      }
    }),
  );
}

/** Fires when a ticket is marked Completed — the "if finished" moment. */
export async function notifyTicketCompleted(ticket: WatchedTicket, completedBy: { id: string; firstName: string; lastName: string }) {
  const watchers = (await getTicketWatchers(ticket.category, ticket.subject, ticket.description)).filter((w) => w.id !== completedBy.id);
  await Promise.all(
    watchers.map(async (w) => {
      await createNotification({
        userId: w.id,
        type: "SYSTEM",
        title: "Ticket completed",
        message: `${ticket.ticketNumber} was marked fulfilled by ${completedBy.firstName} ${completedBy.lastName}`,
        relatedUrl: `/tickets/${ticket.id}`,
      });
      if (w.email) {
        await sendEmail({
          to: w.email,
          subject: `Completed: ${ticket.ticketNumber} — ${ticket.subject}`,
          html: emailShell(
            "A request in your department is done",
            `<p style="color:#475467; font-size:14px; line-height:1.5;"><strong>${ticket.ticketNumber}</strong> — ${ticket.subject}<br/>Marked fulfilled by ${completedBy.firstName} ${completedBy.lastName}.</p>`,
            `/tickets/${ticket.id}`,
            "View ticket",
          ),
        });
      }
    }),
  );
}
