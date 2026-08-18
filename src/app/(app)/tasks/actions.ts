"use server";

import { revalidatePath } from "next/cache";
import type { TaskStatus } from "@prisma/client";
import { taskSchema, taskStatusChangeSchema, taskCommentSchema, type TaskFormState, type TaskCommentFormState } from "@/lib/validation/task";
import { addTaskComment, assignTask, createTask, deleteTask, flagOverdueTasks, updateTask, updateTaskStatus } from "@/lib/services/task.service";

function toInput(formData: FormData) {
  return {
    title: formData.get("title"),
    description: formData.get("description"),
    priority: formData.get("priority"),
    dueDate: formData.get("dueDate"),
    assigneeId: formData.get("assigneeId"),
    departmentId: formData.get("departmentId"),
  };
}

function friendlyError(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

export async function createTaskAction(_prev: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const parsed = taskSchema.safeParse(toInput(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const task = await createTask(undefined, parsed.data);
    revalidatePath("/tasks");
    return { success: true, taskId: task.id };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function updateTaskAction(id: string, _prev: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const parsed = taskSchema.safeParse(toInput(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await updateTask(id, parsed.data);
    revalidatePath("/tasks");
    revalidatePath(`/tasks/${id}`);
    return { success: true, taskId: id };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function updateTaskStatusAction(id: string, status: TaskStatus): Promise<{ error?: string }> {
  const parsed = taskStatusChangeSchema.safeParse({ status });
  if (!parsed.success) return { error: "Invalid status." };
  try {
    await updateTaskStatus(id, parsed.data.status);
    revalidatePath("/tasks");
    revalidatePath(`/tasks/${id}`);
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function assignTaskAction(id: string, assigneeId: string | null): Promise<{ error?: string }> {
  try {
    await assignTask(id, assigneeId);
    revalidatePath("/tasks");
    revalidatePath(`/tasks/${id}`);
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function deleteTaskAction(id: string): Promise<{ error?: string }> {
  try {
    await deleteTask(id);
    revalidatePath("/tasks");
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function addTaskCommentAction(taskId: string, _prev: TaskCommentFormState, formData: FormData): Promise<TaskCommentFormState> {
  const parsed = taskCommentSchema.safeParse({ comment: formData.get("comment") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await addTaskComment(taskId, parsed.data.comment);
    revalidatePath(`/tasks/${taskId}`);
    return { success: true };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function checkOverdueTasksAction(): Promise<{ error?: string; flagged?: number }> {
  try {
    const flagged = await flagOverdueTasks();
    revalidatePath("/tasks");
    return { flagged };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}
