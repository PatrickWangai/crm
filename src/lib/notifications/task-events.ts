import "server-only";
import { createNotification } from "@/lib/services/notification.service";
import { getDepartmentMembers } from "@/lib/services/department-routing";
import { sendEmail } from "@/lib/email/resend";
import { emailShell } from "@/lib/email/templates";

interface RoutedTask {
  id: string;
  code: string;
  title: string;
}

/**
 * Fires when a task is routed to a department without a specific assignee
 * yet — e.g. handing a ticket-driven follow-up off to "Property Management"
 * as a whole rather than one named person. Every active member of that
 * department gets an in-app notification and an email; whoever picks it up
 * can then self-assign like any other task.
 */
export async function notifyDepartmentTask(task: RoutedTask, departmentId: string, departmentName: string) {
  const members = await getDepartmentMembers(departmentId);
  await Promise.all(
    members.map(async (m) => {
      await createNotification({
        userId: m.id,
        type: "TASK_ASSIGNED",
        title: `New task for ${departmentName}`,
        message: task.title,
        relatedUrl: `/tasks/${task.id}`,
      });
      if (m.email) {
        await sendEmail({
          to: m.email,
          subject: `New task for ${departmentName}: ${task.title}`,
          html: emailShell(
            `A task was routed to ${departmentName}`,
            `<p style="color:#475467; font-size:14px; line-height:1.5;"><strong>${task.code}</strong> — ${task.title}</p>`,
            `/tasks/${task.id}`,
            "View task",
          ),
        });
      }
    }),
  );
}
