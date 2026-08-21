export interface HelpTopic {
  keywords: string[];
  answer: string;
  href?: string;
  label?: string;
  /** If set, only shown/matched for users who hold this permission — no point telling someone how to use a page they can't reach. */
  permission?: string;
}

/**
 * Canned navigation help for the internal staff assistant — a keyword match
 * against a fixed FAQ, same "deterministic, not a live AI model" approach
 * as the customer-facing chatbot (see help-chatbot.tsx) and the ticket
 * classifier (classify-ticket.ts). Kept up to date by hand as features
 * ship; there's no live introspection of the app's own feature set.
 */
export const HELP_TOPICS: HelpTopic[] = [
  {
    keywords: ["forward", "ticket", "another department", "different department", "wrong department", "reroute"],
    answer: "Open the ticket, then use \"Forward to dept\" near the top of the page to send it to a different department with an optional note.",
    href: "/tickets",
    label: "Go to Tickets",
    permission: "tickets.assign",
  },
  {
    keywords: ["team", "add", "teammate", "hire", "new employee", "new account", "invite"],
    answer: 'Go to "My Team" and use "Add team member" — it creates a real login for your department and emails them their temporary password.',
    href: "/team",
    label: "Go to My Team",
    permission: "users.manage_department",
  },
  {
    keywords: ["sla", "at risk", "near due", "breach", "deadline", "overdue"],
    answer: '"Check SLA risk" on the Tickets page notifies assignees and the relevant Customer Care team about tickets past 80% of their SLA window or already breached. Ask me "which tickets are at risk" for a quick read without sending notifications.',
    href: "/tickets",
    label: "Go to Tickets",
    permission: "tickets.assign",
  },
  {
    keywords: ["nudge", "remind", "push", "escalate"],
    answer: 'Open a specific ticket and use the "Nudge" button on its Assignment & SLA card to send an immediate reminder to whoever\'s responsible.',
    href: "/tickets",
    label: "Go to Tickets",
    permission: "tickets.assign",
  },
  {
    keywords: ["live activity", "visitors", "who's online", "live chat", "chat with customer"],
    answer: '"Live Activity" shows who\'s currently on the help page and lets you open a live chat with anyone whose request landed in your department.',
    href: "/live-activity",
    label: "Go to Live Activity",
    permission: "live_activity.view",
  },
  {
    keywords: ["review", "rating", "feedback", "customer satisfaction"],
    answer: 'Customer Reviews shows ratings customers leave once their ticket is marked done, broken down by department.',
    href: "/reviews",
    label: "Go to Customer Reviews",
    permission: "reviews.view_all",
  },
  {
    keywords: ["lead", "assign lead", "route lead"],
    answer: "Open a lead's detail page — you can assign it to a specific person or, if it turns out to belong elsewhere, to a whole department.",
    href: "/leads",
    label: "Go to Leads",
    permission: "leads.assign",
  },
  {
    keywords: ["task", "to-do", "todo", "assign task"],
    answer: "Tasks can be created from a ticket, lead, or stakeholder's detail page, or directly on the Tasks page.",
    href: "/tasks",
    label: "Go to Tasks",
  },
  {
    keywords: ["notification", "who gets notified", "alerts", "delegate"],
    answer: "On your Profile page, \"Notification delegate\" lets you choose a backup contact who also receives your notifications — useful while you're away.",
    href: "/profile",
    label: "Go to Profile",
  },
  {
    keywords: ["delete my account", "leave the company", "remove my account", "deactivate", "hand off", "transfer role", "successor", "step down", "promote"],
    answer: "On your Profile page, \"Leave & hand off\" lets you transfer your work (and role, if you're a department head) to a teammate — once they accept, you can deactivate your own account.",
    href: "/profile",
    label: "Go to Profile",
  },
  {
    keywords: ["role", "permission", "what can i do", "access"],
    answer: "Your role and what it can access is set by ICT under Administration > Roles & Permissions. If something looks wrong, ask your department head or ICT.",
  },
];
