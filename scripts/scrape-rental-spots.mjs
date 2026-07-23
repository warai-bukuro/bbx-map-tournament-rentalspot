import { writeFile } from 'fs/promises';

// BEYBLADE X 貸出しスポット スクレイピングスクリプト
// Node.js 18+ (fetch built-in)

const URL = 'https://beyblade.takaratomy.co.jp/beyblade-x/news/rentalspot.html';
const OUTPUT = 'src/data/rentalSpots.json';

// チェーン名正規化マップ
const CHAIN_MAP = {
  '快活クラブ': 'katsuatsu',
  'キッズランドUS': 'kidsland-us',
  'キッズユーエスランド': 'kidsland-us',
  'キッズUS': 'kidsland-us',
  'コート・ダジュール': 'cote-dazur',
  'BEYBLADE BAR TOKYO': 'beyblade-bar-tokyo',
  '香取神社': 'katori-jinja',
  'hotel MONday': 'hotel-monday',
  'ラウンドワンスタジアム スポッチャ内': 'round1-spoccha',
};

function normalizeChain(name) {
  for (const [key, val] of Object.entries(CHAIN_MAP)) {
    if (name.includes(key)) return val;
  }
  // ラウンドワンスタジアム系列
  if (name.includes('ラウンドワンスタジアム')) return 'round1-spoccha';
  return name.replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g, '').toLowerCase();
}

function parseAddress(raw) {
  // 郵便番号除去
  let addr = raw.replace(/〒\d{3}-?\d{4}\s*/g, '').trim();
  // 電話番号除去（念のため）
  addr = addr.replace(/\d{2,4}-\d{2,4}-\d{3,4}/g, '').trim();
  return addr;
}

async function scrape() {
  console.log('Fetching:', URL);
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  // テーブル行を抽出（正規表現でざっくり）
  const rows = [];
  const tableRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  while ((match = tableRegex.exec(html)) !== null) {
    const rowHtml = match[1];
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1].trim());
    if (cells.length >= 3) {
      rows.push({
        name: cells[0].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim(),
        address: parseAddress(cells[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()),
        phone: cells[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim(),
      });
    }
  }

  // 見出し行（チェーン名）を抽出
  const chainHeaders = [...html.matchAll(/<h3[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/h3>/gi)];
  const chainNames = chainHeaders.map(m => ({
    id: m[1],
    name: m[2].replace(/<[^>]+>/g, '').trim(),
  }));

  console.log('Found chains:', chainNames.map(c => c.name));

  // 各店舗にチェーン名を割り当て（HTMLの構造上、順番で判断するしかないため簡易的に）
  // 実際には各店舗の前のh3を見るべきだが、正規表現パースでは困難
  // ここでは店舗名からチェーンを推測
  const spots = rows.map((r, i) => ({
    id: String(i + 1),
    name: r.name,
    chain: normalizeChain(r.name),
    address: r.address,
    phone: r.phone || undefined,
    // 緯度経度は後でジオコーディングで取得
    lat: null,
    lng: null,
  }));

  console.log(`Scraped ${spots.length} spots`);

  // チェーン別集計
  const chainCounts = {};
  for (const s of spots) {
    chainCounts[s.chain] = (chainCounts[s.chain] || 0) + 1;
  }
  console.log('Chain counts:', chainCounts);

  // 暫定色マップ
  const chainColors = {
    'katsuatsu': '#e63946',        // 赤系（快活クラブ）
    'kidsland-us': '#f4a261',      // オレンジ系
    'cote-dazur': '#2a9d8f',       // 青緑系
    'beyblade-bar-tokyo': '#e9c46a', // 黄色系
    'katori-jinja': '#78909c',     // グレー
    'hotel-monday': '#ab47bc',     // 紫
    'round1-spoccha': '#457b9d',   // 青
  };

  const output = {
    fetchedAt: new Date().toISOString(),
    source: URL,
    chainColors,
    spots,
  };

  await writeFile(OUTPUT, JSON.stringify(output, null, 2));
  console.log('Saved to:', OUTPUT);
}

scrape().catch(console.error);