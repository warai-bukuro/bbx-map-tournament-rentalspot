export type EventType =
  | 'b4store'
  | 's1'
  | 'ambassador'
  | 'extreme-cup'
  | 'casual-battle'
  | 'tour'
  | 'other'
  | 'fan';

export type AgeCategory = 'open' | 'regular';
export type TournamentGrade = 'G3' | 'G2' | 'G1' | 'S1' | 'other';

export interface TournamentEvent {
  id: string;
  name: string;
  type: EventType;
  ageCategory: AgeCategory;
  grade: TournamentGrade;
  /** "2026/06/07 13:00:00" 形式 */
  startDate: string;
  venue: string;
  address: string;
  prefecture: string;
  lat: number;
  lng: number;
  /** 当日受付 (1=あり, 0=なし) */
  uketsuke: number;
  price?: string;
  capacity?: number;
  shikaku?: string;
  /** 参加方法 */
  houhou?: string;
  /** 案内 */
  annai?: string;
  /** 告知媒体 */
  media?: string;
  /** 大会形式 */
  keishiki?: string;
  /** 持ち物 */
  motimono?: string;
  /** お知らせ */
  tyuui?: string;
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
  houhou: string | null;
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

/** イベントのグレード → 色 */
export const GRADE_COLORS: Record<TournamentGrade, string> = {
  G3:    '#29b6f6', // 水色
  G2:    '#66bb6a', // 緑
  G1:    '#ffa726', // 琥珀
  S1:    '#e91e8c', // マゼンタ
  other: '#78909c', // グレー
};

/** アンバサダー等の特殊タイプ色（grade=other 時に使用） */
const TYPE_OVERRIDE_COLORS: Partial<Record<EventType, string>> = {
  ambassador:    '#9ccc65', // 黄緑
  'extreme-cup': '#ab47bc', // 紫（独自）
  'casual-battle': '#78909c',
  tour:  '#78909c',
  fan:   '#78909c',
  other: '#78909c',
};

/** バッジに表示するラベルを返す */
export function getBadgeLabel(event: { grade: TournamentGrade; type: EventType }): string {
  if (event.grade !== 'other') return event.grade; // G1/G2/G3/S1
  return EVENT_TYPE_LABELS[event.type];
}

/** バッジの背景色を返す */
export function getBadgeColor(event: { grade: TournamentGrade; type: EventType }): string {
  if (event.grade !== 'other') return GRADE_COLORS[event.grade];
  return TYPE_OVERRIDE_COLORS[event.type] ?? GRADE_COLORS.other;
}

export const AGE_CATEGORY_LABELS: Record<AgeCategory, string> = {
  open: 'オープン',
  regular: 'レギュラー',
};

export const GRADE_LABELS: Record<TournamentGrade, string> = {
  G3: 'G3',
  G2: 'G2',
  G1: 'G1',
  S1: 'S1',
  other: 'その他',
};

export function mapAgeCategory(apiEvent: ApiEvent): AgeCategory {
  const s = [apiEvent.keishiki, apiEvent.event_shubetsu, apiEvent.event_type_open_name, apiEvent.event_type_name]
    .filter(Boolean).join(' ');
  if (/レギュラー|regular/i.test(s)) return 'regular';
  return 'open';
}

export function mapTournamentGrade(apiEvent: ApiEvent): TournamentGrade {
  const s = [apiEvent.event_shubetsu, apiEvent.event_type_open_name, apiEvent.event_type_name]
    .filter(Boolean).join(' ');
  if (/\bG1\b/i.test(s)) return 'G1';
  if (/\bG2\b/i.test(s)) return 'G2';
  if (/\bG3\b/i.test(s)) return 'G3';
  if (/\bS1\b/i.test(s)) return 'S1';
  return 'other';
}

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

/** レンタル店舗チェーン */
export type RentalChain =
  | 'katsuatsu'
  | 'kidsland-us'
  | 'cote-dazur'
  | 'beyblade-bar-tokyo'
  | 'katori-jinja'
  | 'hotel-monday'
  | 'round1-spoccha'
  | 'other';

export interface RentalSpot {
  id: string;
  name: string;
  chain: RentalChain;
  address: string;
  prefecture?: string;
  phone?: string;
  lat: number | null;
  lng: number | null;
}

/** レンタル店舗データ全体（JSONから読み込む形式） */
export interface RentalSpotsData {
  fetchedAt: string;
  source: string;
  chainColors: Record<RentalChain, string>;
  spots: RentalSpot[];
}

export const RENTAL_CHAIN_LABELS: Record<RentalChain, string> = {
  'katsuatsu': '快活クラブ',
  'kidsland-us': 'キッズランドUS',
  'cote-dazur': 'コート・ダジュール',
  'beyblade-bar-tokyo': 'BEYBLADE BAR TOKYO',
  'katori-jinja': '香取神社',
  'hotel-monday': 'hotel MONday',
  'round1-spoccha': 'ラウンドワン スポッチャ',
  'other': 'その他',
};

export const RENTAL_CHAIN_COLORS: Record<RentalChain, string> = {
  'katsuatsu': '#e63946',
  'kidsland-us': '#f4a261',
  'cote-dazur': '#2a9d8f',
  'beyblade-bar-tokyo': '#e9c46a',
  'katori-jinja': '#78909c',
  'hotel-monday': '#ab47bc',
  'round1-spoccha': '#457b9d',
  'other': '#78909c',
};

/** 都道府県を住所から抽出 */
export function extractPrefecture(address: string): string {
  const match = address.match(/^(北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)/);
  return match ? match[1] : '';
}

/** マーカー共通インターフェース（イベント・店舗共通で扱う用） */
export interface MapMarker {
  id: string;
  type: 'event' | 'rental';
  lat: number;
  lng: number;
  label: string;
  color: string;
  chain?: RentalChain;
  eventType?: EventType;
  grade?: TournamentGrade;
}
