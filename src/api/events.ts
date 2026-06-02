import type { ApiEvent, ApiResponse } from "../types";

const API_URL =
  "https://beyblade.takaratomy.co.jp/beyblade-x/shop_event/event_manage/public/api/open_all_event";

const CACHE_KEY = "bbx_events_cache";
const TTL_MS = 60 * 60 * 1000; // 1時間

interface CacheEntry {
  fetchedAt: number;
  events: ApiEvent[];
}

function loadCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.fetchedAt < TTL_MS) return entry;
    localStorage.removeItem(CACHE_KEY);
    return null;
  } catch {
    return null;
  }
}

function saveCache(events: ApiEvent[]): void {
  try {
    const entry: CacheEntry = { fetchedAt: Date.now(), events };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage が使えない環境（容量超過など）は無視
  }
}

export async function fetchApiEvents(): Promise<ApiEvent[]> {
  const cached = loadCache();
  if (cached) return cached.events;

  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`API fetch failed: ${res.status}`);
  const json: ApiResponse = await res.json();
  if (json.state !== "success")
    throw new Error("API returned non-success state");

  saveCache(json.events);
  return json.events;
}
