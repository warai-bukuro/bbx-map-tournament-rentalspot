import type { ApiEvent } from '../types';

/**
 * APIレスポンスから住所文字列を解決する。
 *
 * パターン1: place_address が空 & address2 が完全住所（都道府県含む）
 *   → address2 をそのまま使う
 * パターン2: place_address が空 & address2 が番地のみ
 *   → address1 + address2 を結合する
 * パターン3: place_address に都道府県名が2重（例: "愛知県愛知県名古屋市..."）
 *   → 先頭の重複を除去する
 */
export function resolveAddress(e: ApiEvent): string {
  if (e.place_address) {
    return deduplicatePrefecture(e.place_address);
  }

  const a1 = e.address1 && e.address1 !== 'NONE' ? e.address1 : '';
  const a2 = e.address2 ?? '';

  if (!a1 && !a2) return '';
  // address2 がすでに都道府県から始まっている場合はそのまま使う
  if (a1 && a2.startsWith(a1)) return a2;
  return a1 + a2;
}

/**
 * "愛知県愛知県名古屋市..." のような都道府県名の重複を除去する。
 * 都道府県名（東京都/大阪府/京都府/北海道/〇〇県）が先頭で2回繰り返されていたら
 * 1回分を取り除く。
 */
function deduplicatePrefecture(addr: string): string {
  // 都・道・府・県 で終わる最短マッチを先頭から2回探す
  const match = addr.match(/^(東京都|大阪府|京都府|北海道|.+?[都道府県])\1/);
  if (match) return addr.slice(match[1].length);
  return addr;
}

/**
 * 都道府県名を解決する。
 * place_address1 があればそれを使い、なければ address1 を使う（"NONE" は除外）。
 */
export function resolvePrefecture(e: ApiEvent): string {
  if (e.place_address1) return e.place_address1;
  if (e.address1 && e.address1 !== 'NONE') return e.address1;
  return '';
}
