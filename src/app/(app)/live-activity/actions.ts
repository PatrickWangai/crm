"use server";

import { getLiveActivitySnapshot, type LiveActivitySnapshot } from "@/lib/services/live-activity.service";

export async function refreshLiveActivityAction(): Promise<LiveActivitySnapshot> {
  return getLiveActivitySnapshot();
}
