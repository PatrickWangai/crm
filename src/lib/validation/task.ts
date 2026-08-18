import { z } from "zod";

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const TASK_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "OVERDUE"] as const;

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(150),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  priority: z.enum(TASK_PRIORITIES),
  dueDate: z.string().optional().or(z.literal("")),
  assigneeId: z.string().optional().or(z.literal("")),
  departmentId: z.string().optional().or(z.literal("")),
});

export type TaskInput = z.infer<typeof taskSchema>;

export const taskStatusChangeSchema = z.object({
  status: z.enum(TASK_STATUSES),
});

export const taskCommentSchema = z.object({
  comment: z.string().trim().min(1, "Comment cannot be empty").max(2000),
});

export interface TaskFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  taskId?: string;
}

export interface TaskCommentFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
}
