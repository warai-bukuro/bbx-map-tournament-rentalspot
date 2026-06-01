export type EventType =
  | 'b4store'
  | 's1'
  | 'ambassador'
  | 'extreme-cup'
  | 'casual-battle'
  | 'tour'
  | 'other'
  | 'fan';

export interface TournamentEvent {
  id: string;
  name: string;
  type: EventType;
  date: string;
  venue: string;
  address: string;
  prefecture: string;
  lat: number;
  lng: number;
  price?: string;
  capacity?: number;
  shikaku?: string;
  annai?: string;
  detailUrl?: string;
}

/** 公式APIのレスポンス形式 */
export interface ApiEvent {
  id: number;
  event_type_id: number;
  event_type_name: string;
  event_type_open_name: string;
  event_type_other: string | null;
  name: string | null;
  start_date: string;
  shop_name: string;
  address1: string;
  address2: string;
  place_name: string;
  place_address: string;
  place_address1: string;
  place_address2: string;
  fee: number | null;
  capacity: number;
  price: string | null;
  shikaku: string;
  annai: string;
  detail_link_url: string | null;
  uketsuke: number;
  state: number;
  media: string | null;
  keishiki: string;
  motimono: string;
  tyuui: string | null;
  event_shubetsu: string;
}

export interface ApiResponse {
  state: string;
  events: ApiEvent[];
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  'b4store': 'B4ストア',
  's1': 'S1イベント',
  'ambassador': 'アンバサダー',
  'extreme-cup': 'エクストリームカップ',
  'casual-battle': 'カジュアルバトルデイ',
  'tour': '出張イベント',
  'other': 'その他',
  'fan': 'ファン主催',
};

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  'b4store': '#e63946',
  's1': '#f4a261',
  'ambassador': '#2a9d8f',
  'extreme-cup': '#e9c46a',
  'casual-battle': '#457b9d',
  'tour': '#a8dadc',
  'other': '#8ecae6',
  'fan': '#b5838d',
};

const TYPE_NAME_MAP: Record<string, EventType> = {
  'B4大会': 'b4store',
  'B4イベント': 'b4store',
  'S1大会': 's1',
  'S1イベント': 's1',
  'アンバサダーイベント': 'ambassador',
  'エクストリームカップ': 'extreme-cup',
  'カジュアルバトルデイ': 'casual-battle',
  'CASUAL BATTLE DAY': 'casual-battle',
  '出張イベント': 'tour',
  'ファン主催イベント': 'fan',
};

export function mapEventType(apiEvent: ApiEvent): EventType {
  const key = apiEvent.event_type_open_name || apiEvent.event_type_name;
  return TYPE_NAME_MAP[key] ?? 'other';
}
