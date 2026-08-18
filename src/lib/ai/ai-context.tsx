"use client";

import { createContext, useContext } from "react";

const AiAssistantContext = createContext(false);

export function AiAssistantProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  return <AiAssistantContext.Provider value={enabled}>{children}</AiAssistantContext.Provider>;
}

/** Whether the AI Assistant integration is enabled, set once in the (app) layout from isAiAssistantEnabled(). */
export function useAiAssistantEnabled(): boolean {
  return useContext(AiAssistantContext);
}
