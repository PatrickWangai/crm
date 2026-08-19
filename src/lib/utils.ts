import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

const ROLE_INITIALS_STOPWORDS = new Set(["of", "and", "the", "&"]);

/** Two-letter initials derived from a role name (e.g. "ICT Administrator" -> "IA"), for surfaces that identify the logged-in user by role rather than by name. */
export function roleInitials(roleName: string): string {
  const words = roleName.split(/\s+/).filter((w) => w && !ROLE_INITIALS_STOPWORDS.has(w.toLowerCase()));
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
}

export function formatCurrency(amount: number | string, currency = "KES"): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Turns a SCREAMING_SNAKE_CASE enum value into "Title Case" for display. */
export function labelize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
