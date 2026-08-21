import "server-only";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, ForbiddenError, UnauthorizedError } from "@/lib/rbac/guard";
import { forwardTicketToDepartment, assignTicket, nudgeTicket, listAtRiskTickets, listTickets } from "@/lib/services/ticket.service";
import { listTasks } from "@/lib/services/task.service";
import { listTicketDepartmentOptions, listUserOptions } from "@/lib/services/lookups.service";
import { parseAssistantIntent } from "@/lib/assistant/parse-intent";
import { HELP_TOPICS } from "@/lib/assistant/help-topics";
import { NAV_SECTIONS } from "@/lib/nav-config";
import { permissionsOf } from "@/lib/auth/session";

export interface AssistantReply {
  text: string;
  href?: string;
  label?: string;
}

function friendlyError(err: unknown): string {
  if (err instanceof ForbiddenError || err instanceof UnauthorizedError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong with that.";
}

async function findTicketByNumber(ticketNumber: string) {
  return prisma.ticket.findUnique({ where: { ticketNumber }, select: { id: true, ticketNumber: true, subject: true, status: true, dueAt: true, department: { select: { name: true } }, assignedTo: { select: { firstName: true, lastName: true } } } });
}

/** Loose contains-match on department name/code — "finance" matches "Finance", "sacco" matches "Customer Care – SACCO", etc. Errors (not silently guesses) when it's ambiguous or nothing matches. */
async function resolveDepartmentQuery(query: string) {
  const departments = await listTicketDepartmentOptions();
  const q = query.trim().toLowerCase();
  const matches = departments.filter((d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q));
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) {
    const names = departments.map((d) => d.name).join(", ");
    throw new Error(`I don't recognize "${query}" as a department. Try one of: ${names}.`);
  }
  throw new Error(`"${query}" matches more than one department (${matches.map((d) => d.name).join(", ")}) — be more specific.`);
}

/** Loose contains-match on full name — errors on zero or multiple matches rather than guessing who someone means. */
async function resolvePersonQuery(query: string) {
  const people = await listUserOptions();
  const q = query.trim().toLowerCase();
  const matches = people.filter((p) => p.name.toLowerCase().includes(q));
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) throw new Error(`I can't find anyone matching "${query}".`);
  throw new Error(`"${query}" matches more than one person (${matches.map((p) => p.name).join(", ")}) — try a fuller name.`);
}

/**
 * Dispatches a parsed command to the real service functions — every action
 * here goes through the same requireAnyPermission/requirePermission checks
 * the normal UI uses, so the assistant can never do anything the signed-in
 * user couldn't already do by clicking through the app themselves. Never
 * throws — returns a plain-text reply either way, matching the "safe to
 * show directly in a chat bubble" contract the UI expects.
 */
export async function runAssistantCommand(raw: string): Promise<AssistantReply> {
  const me = await requireAuth();
  const intent = parseAssistantIntent(raw);

  try {
    switch (intent.type) {
      case "forward_ticket": {
        const ticket = await findTicketByNumber(intent.ticketNumber);
        if (!ticket) return { text: `I can't find a ticket numbered ${intent.ticketNumber}.` };
        const department = await resolveDepartmentQuery(intent.departmentQuery);
        await forwardTicketToDepartment(ticket.id, department.id, `Forwarded via assistant by ${me.firstName} ${me.lastName}`);
        return { text: `Done — forwarded ${ticket.ticketNumber} to ${department.name}.`, href: `/tickets/${ticket.id}`, label: "View ticket" };
      }

      case "assign_ticket": {
        const ticket = await findTicketByNumber(intent.ticketNumber);
        if (!ticket) return { text: `I can't find a ticket numbered ${intent.ticketNumber}.` };
        const person = await resolvePersonQuery(intent.personQuery);
        await assignTicket(ticket.id, person.id);
        return { text: `Done — assigned ${ticket.ticketNumber} to ${person.name}.`, href: `/tickets/${ticket.id}`, label: "View ticket" };
      }

      case "nudge_ticket": {
        const ticket = await findTicketByNumber(intent.ticketNumber);
        if (!ticket) return { text: `I can't find a ticket numbered ${intent.ticketNumber}.` };
        const notified = await nudgeTicket(ticket.id);
        return notified > 0
          ? { text: `Nudged ${ticket.ticketNumber} — reminder sent.`, href: `/tickets/${ticket.id}`, label: "View ticket" }
          : { text: `${ticket.ticketNumber} has no assignee or department to nudge.` };
      }

      case "lookup_ticket": {
        const ticket = await findTicketByNumber(intent.ticketNumber);
        if (!ticket) return { text: `I can't find a ticket numbered ${intent.ticketNumber}.` };
        const who = ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : "unassigned";
        const dept = ticket.department?.name ?? "no department";
        return { text: `${ticket.ticketNumber}: "${ticket.subject}" — ${ticket.status}, ${dept}, ${who}.`, href: `/tickets/${ticket.id}`, label: "Open ticket" };
      }

      case "my_tickets": {
        const { data } = await listTickets({ assignedToId: me.id, pageSize: 5 });
        if (data.length === 0) return { text: "You have no tickets assigned right now." };
        const lines = data.map((t) => `• ${t.ticketNumber}: ${t.subject} (${t.status})`).join("\n");
        return { text: `Your open tickets:\n${lines}`, href: "/tickets", label: "See all" };
      }

      case "my_tasks": {
        const { data } = await listTasks({ assigneeId: me.id, pageSize: 5 });
        if (data.length === 0) return { text: "You have no tasks assigned right now." };
        const lines = data.map((t) => `• ${t.title} (${t.status})`).join("\n");
        return { text: `Your tasks:\n${lines}`, href: "/tasks", label: "See all" };
      }

      case "sla_risk_summary": {
        const atRisk = await listAtRiskTickets();
        if (atRisk.length === 0) return { text: "Nothing at risk right now — every open ticket is comfortably inside its SLA window." };
        const lines = atRisk
          .slice(0, 8)
          .map((t) => `• ${t.ticketNumber}${t.breached ? " (breached)" : " (near due)"}: ${t.subject}`)
          .join("\n");
        return { text: `${atRisk.length} ticket(s) at risk or breached:\n${lines}`, href: "/tickets", label: "See all" };
      }

      case "help": {
        if (intent.topic) return { text: intent.topic.answer, href: intent.topic.href, label: intent.topic.label };
        return {
          text: "Hi! I can help you navigate the CRM or do things directly — try \"forward TKT-000123 to Finance\", \"my tickets\", \"which tickets are at risk\", or ask how to do something (e.g. \"how do I add a team member\").",
        };
      }

      default: {
        const granted = permissionsOf(me);
        const reachable = NAV_SECTIONS.flatMap((s) => s.items).filter((item) => {
          const perms = Array.isArray(item.permission) ? item.permission : [item.permission];
          return perms.some((p) => granted.has(p));
        });
        const suggestion = reachable
          .slice(0, 6)
          .map((i) => i.label)
          .join(", ");
        return { text: `I didn't quite catch that. I can help with things like: ${suggestion}. Or try a specific request, e.g. "forward TKT-000123 to Finance".` };
      }
    }
  } catch (err) {
    return { text: friendlyError(err) };
  }
}

export { HELP_TOPICS };
