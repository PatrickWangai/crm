export type SupportStage = 1 | 2 | 3;

export interface SupportStageInfo {
  stage: SupportStage;
  label: string;
}

const STAGE_LABELS: [string, string, string] = ["Received", "Being worked on", "Done"];

/**
 * Maps the full internal ticket status to the 3-step progress a customer
 * sees when tracking their request: Received -> [department] is working on
 * it -> Done. REQUEST_LOGGED and ASSIGNED both read as "Received" — the
 * department has it queued/acknowledged either way; the visible jump to
 * "working on it" happens specifically when staff click Contact Customer
 * (status -> IN_PROGRESS), not merely on being assigned.
 */
export function getSupportStage(status: string, departmentOrBusinessUnitName?: string | null): SupportStageInfo {
  if (status === "COMPLETED" || status === "CLOSED") {
    return { stage: 3, label: STAGE_LABELS[2] };
  }
  if (status === "IN_PROGRESS") {
    return { stage: 2, label: departmentOrBusinessUnitName ? `${departmentOrBusinessUnitName} is working on it` : "We're working on it" };
  }
  return { stage: 1, label: STAGE_LABELS[0] };
}

export const SUPPORT_STAGE_STEPS = STAGE_LABELS;
