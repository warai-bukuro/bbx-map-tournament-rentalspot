import type { RentalSpot, RentalSpotsData, RentalChain } from '../types';
import { RENTAL_CHAIN_LABELS, extractPrefecture } from '../types';
import { geocodeAddresses, isCachedAddresses } from '../utils/geocode';

const DATA_URL = '/rentalSpots.json';
const CACHE_KEY = 'bbx_rental_spots_cache_v2'; // v2 to invalidate old corrupted cache
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24時間

interface CacheEntry {
  fetchedAt: number;
  data: RentalSpotsData;
}

function loadCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.fetchedAt < CACHE_TTL) return entry;
    localStorage.removeItem(CACHE_KEY);
    return null;
  } catch {
    return null;
  }
}

function saveCache(data: RentalSpotsData): void {
  try {
    const entry: CacheEntry = { fetchedAt: Date.now(), data };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // 忽略存储错误
  }
}

/** 静的JSONからレンタル店舗データを読み込む */
export async function loadRentalSpotsData(): Promise<RentalSpotsData> {
  const cached = loadCache();
  if (cached) return cached.data;

  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`Failed to load rental spots: ${res.status}`);
  const data: RentalSpotsData = await res.json();

  // 都道府県を補完
  for (const spot of data.spots) {
    if (!spot.prefecture) {
      spot.prefecture = extractPrefecture(spot.address);
    }
  }

  saveCache(data);
  return data;
}

/** 緯度経度を付与したスポット配列を取得（ジオコーディング込み） */
export async function fetchRentalSpots(
  onProgress?: (done: number, total: number) => void,
  onAddressResolved?: (address: string, latlng: { lat: number; lng: number } | null) => void,
): Promise<RentalSpot[]> {
  const data = await loadRentalSpotsData();

  // 緯度経度が未取得の住所を抽出
  const needGeocode = data.spots
    .filter(s => s.lat === null || s.lng === null)
    .map(s => s.address);

  if (needGeocode.length > 0) {
    const allCached = isCachedAddresses(needGeocode);
    if (!allCached) {
      // ジオコーディング実行
      const coords = await geocodeAddresses(needGeocode, onProgress, onAddressResolved);
      // 結果を反映
      for (const spot of data.spots) {
        if (spot.lat === null || spot.lng === null) {
          const latlng = coords[spot.address];
          if (latlng) {
            spot.lat = latlng.lat;
            spot.lng = latlng.lng;
          }
        }
      }
    } else {
      // キャッシュから即座に復元
      const coords = await geocodeAddresses(needGeocode, onProgress, onAddressResolved);
      for (const spot of data.spots) {
        if (spot.lat === null || spot.lng === null) {
          const latlng = coords[spot.address];
          if (latlng) {
            spot.lat = latlng.lat;
            spot.lng = latlng.lng;
          }
        }
      }
    }
  }

  // 緯度経度があるものだけ返す
  return data.spots.filter(s => s.lat !== null && s.lng !== null);
}

/** チェーン別の色を取得（データに含まれる場合） */
export function getChainColor(chain: RentalChain, data?: RentalSpotsData): string {
  return data?.chainColors?.[chain] ?? RENTAL_CHAIN_LABELS[chain] ?? '#78909c';
}

/** チェーン別のラベルを取得 */
export function getChainLabel(chain: RentalChain): string {
  return RENTAL_CHAIN_LABELS[chain] ?? chain;
}

/** 全チェーン一覧を取得 */
export function getAllChains(data: RentalSpotsData): RentalChain[] {
  const chains = new Set<RentalChain>();
  for (const spot of data.spots) chains.add(spot.chain);
  return [...chains].sort();
}