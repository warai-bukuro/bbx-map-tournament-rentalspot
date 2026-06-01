# BBX 大会マップ

ベイブレードXの大会スケジュールを地図上で可視化するWebアプリ。

## 機能

- **地図表示**: 日本全国の大会開催地をカラーピンで表示
- **イベント種別フィルター**: B4ストア・S1・エクストリームカップ等8種を個別に絞り込み
- **テキスト検索**: 会場名・都道府県・住所でリアルタイム検索
- **詳細パネル**: ピンまたはリストをクリックで参加費・定員・参加資格・案内を表示
- **Google Maps連携**: 詳細パネルからそのまま地図アプリで開ける
- **キャッシュ**: ジオコーディング結果をlocalStorageに保存し、2回目以降は即時表示

## 技術スタック

| 役割 | 技術 |
|---|---|
| フレームワーク | React 18 + TypeScript |
| ビルド | Vite 6 |
| 地図 | Leaflet + react-leaflet + OpenStreetMap |
| ジオコーディング | 国土地理院 住所検索API |

## セットアップ

```bash
npm install
npm run dev      # 開発サーバー起動 (http://localhost:5173)
npm run build    # プロダクションビルド
npm run preview  # ビルド結果のプレビュー
```

## データソース

### 大会データ

公式APIからページ読み込み時に1回だけ取得する。

```
GET https://beyblade.takaratomy.co.jp/beyblade-x/shop_event/event_manage/public/api/open_all_event
```

レスポンス形式:

```json
{
  "state": "success",
  "events": [
    {
      "id": 48063,
      "event_type_open_name": "S1イベント",
      "name": "S1イベント㊿",
      "start_date": "2026-05-31 06:00",
      "place_name": "出部公民館",
      "place_address": "岡山県井原市上出部町1219-2",
      "place_address1": "岡山県",
      "price": "無料",
      "capacity": 128,
      "shikaku": "6歳以上だれでもOK"
    }
  ]
}
```

### ジオコーディング

APIレスポンスに座標は含まれないため、[国土地理院 住所検索API](https://msearch.gsi.go.jp/address-search/AddressSearch) で住所→緯度経度に変換する。

- CORSに対応しており、ブラウザから直接呼び出し可能
- 5件並列でバッチ処理（200ms間隔）
- 取得結果は `localStorage` にキャッシュ（キー: `bbx_geocode_cache_v2`）
- 座標が取得できなかったイベントはマップから除外

## ディレクトリ構成

```
src/
├── api/
│   └── events.ts        # 公式API fetch
├── components/
│   ├── EventCard.tsx    # リスト内の1件カード
│   ├── EventDetail.tsx  # 詳細オーバーレイ（右下）
│   ├── EventList.tsx    # サイドバーのリスト
│   ├── FilterBar.tsx    # 検索・タイプフィルター
│   └── MapView.tsx      # Leaflet地図・CircleMarker
├── data/
│   └── events.json      # サンプルデータ（未使用・参考用）
├── types/
│   └── index.ts         # TournamentEvent・ApiEvent 型定義
├── utils/
│   ├── date.ts          # 日付フォーマット
│   └── geocode.ts       # 国土地理院ジオコーディング + キャッシュ
├── App.tsx              # 状態管理・レイアウト
├── index.css            # デザイントークン・スタイル
└── main.tsx             # エントリーポイント
```

## イベント種別

| 種別 | APIの `event_type_open_name` |
|---|---|
| B4ストア | `B4大会` / `B4イベント` |
| S1イベント | `S1大会` / `S1イベント` |
| アンバサダー | `アンバサダーイベント` |
| エクストリームカップ | `エクストリームカップ` |
| カジュアルバトルデイ | `カジュアルバトルデイ` / `CASUAL BATTLE DAY` |
| 出張イベント | `出張イベント` |
| ファン主催 | `ファン主催イベント` |
| その他 | 上記以外 |

## 参考

- [デザイン参考: LBE Map](https://webar.styly.cc/landing_pages/lbe-map)
- [公式スケジュールページ](https://beyblade.takaratomy.co.jp/beyblade-x/event/schedule.html#schedule)
