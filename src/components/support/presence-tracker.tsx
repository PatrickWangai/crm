"use client";

import { useEffect } from "react";

const HEARTBEAT_MS = 25_000;
const SESSION_KEY = "mw_help_session_id";

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/**
 * Invisible — sends a "someone is on this page" beacon so Customer Care's
 * live-activity view can show real visitor presence. `endpoint` is relative
 * for this app's own /help page and an absolute cross-origin URL for the
 * standalone customer app (see that repo's copy of this component).
 */
export function PresenceTracker({ endpoint, source, ticketNumber }: { endpoint: string; source: "crm" | "customer"; ticketNumber?: string }) {
  useEffect(() => {
    const sessionId = getSessionId();
    const path = window.location.pathname;

    const ping = (action: "pageview" | "heartbeat") => {
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, source, path, ticketNumber, action }),
        keepalive: true,
      }).catch(() => {});
    };

    ping("pageview");
    const interval = setInterval(() => ping("heartbeat"), HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [endpoint, source, ticketNumber]);

  return null;
}
