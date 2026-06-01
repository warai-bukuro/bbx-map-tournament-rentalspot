import type { ApiEvent, ApiResponse } from "../types";

const API_URL =
  "https://beyblade.takaratomy.co.jp/beyblade-x/shop_event/event_manage/public/api/open_all_event";

export async function fetchApiEvents(): Promise<ApiEvent[]> {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`API fetch failed: ${res.status}`);
  const json: ApiResponse = await res.json();
  if (json.state !== "success")
    throw new Error("API returned non-success state");
  return json.events;
}
