// 国土地理院 住所検索API（CORS対応・無料・日本語住所に最適化）
// https://msearch.gsi.go.jp/address-search/AddressSearch?q={address}
// レスポンス: GeoJSON Feature[]、coordinates は [lng, lat] の順
const GSI_BASE = 'https://msearch.gsi.go.jp/address-search/AddressSearch';
const CACHE_KEY = 'bbx_geocode_cache_v3';

/**
 * ジオコーディング前に住所から余分な情報を除去する。
 * 「6階」「B1F」「〒xxx」などはAPIが解釈できず座標を返せない。
 * 元の住所をキャッシュキーとして使い、クエリだけ正規化する。
 */
function normalizeAddress(address: string): string {
  return address
    .replace(/\s*[〒＊]\s*\d{3}[-−]\d{4}\s*/g, '') // 郵便番号
    .replace(/\s+[BbＢｂ]?\d+[FfＦｆ階]/g, '')      // 階数（6階 / 6F / B1F）
    .replace(/\s+\d+番[出口]?$/g, '')                // ～番口
    .replace(/（[^）]*）/g, '')                       // （）内の補足
    .replace(/\([^)]*\)/g, '')                       // ()内の補足
    .trim();
}

type LatLng = { lat: number; lng: number };

interface GsiFeature {
  geometry: { coordinates: [number, number]; type: 'Point' };
  type: 'Feature';
  properties: { addressCode: string; title: string };
}

function loadCache(): Record<string, LatLng> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, LatLng>) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

async function geocodeOne(address: string): Promise<LatLng | null> {
  const query = normalizeAddress(address);
  const url = `${GSI_BASE}?q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data: GsiFeature[] = await res.json();
    if (!data.length) return null;
    const [lng, lat] = data[0].geometry.coordinates;
    return { lat, lng };
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 住所リストを一括ジオコーディング（国土地理院API使用）。
 * - localStorage キャッシュを優先利用（キャッシュがあれば即時返却）
 * - 未キャッシュのものだけAPIに問い合わせ（並列5件ずつバッチ処理）
 * - 取得できなかった住所は null を返す
 */
export async function geocodeAddresses(
  addresses: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<Record<string, LatLng | null>> {
  const cache = loadCache();
  const result: Record<string, LatLng | null> = {};
  const uncached: string[] = [];

  for (const addr of addresses) {
    if (cache[addr] !== undefined) {
      result[addr] = cache[addr];
    } else {
      uncached.push(addr);
    }
  }

  let done = Object.keys(result).length;
  const total = addresses.length;
  onProgress?.(done, total);

  const BATCH = 5;
  for (let i = 0; i < uncached.length; i += BATCH) {
    const batch = uncached.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(geocodeOne));
    for (let j = 0; j < batch.length; j++) {
      const addr = batch[j];
      const latlng = results[j];
      result[addr] = latlng;
      if (latlng) cache[addr] = latlng;
      done++;
      onProgress?.(done, total);
    }
    if (i + BATCH < uncached.length) {
      await sleep(200);
    }
  }

  saveCache(cache);
  return result;
}
