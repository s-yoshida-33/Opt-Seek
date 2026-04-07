export interface Product {
  id: string
  name: string
  nameEn: string
  category: string
  description: string
  price: string
  color: string
  accentColor: string
  imageUrl?: string
}

// ─── Seed data ────────────────────────────────────────────────────────────────
const CATEGORIES: Array<{ ja: string; color: string; accent: string }> = [
  { ja: '花・装飾',       color: '#1a0d12', accent: '#d4748c' },
  { ja: '料理',           color: '#0d1a10', accent: '#5da86e' },
  { ja: 'ドレス・衣装',   color: '#14100a', accent: '#c9a84c' },
  { ja: '演出',           color: '#0d0a1a', accent: '#8878cc' },
  { ja: '写真・映像',     color: '#0a1420', accent: '#5896c8' },
  { ja: '会場装飾',       color: '#1a0e0a', accent: '#d48c5a' },
  { ja: 'ジュエリー',     color: '#120a1a', accent: '#a068d8' },
  { ja: 'ヘアメイク',     color: '#1a1510', accent: '#b8a070' },
  { ja: '音楽',           color: '#0a1a18', accent: '#4ab8a8' },
  { ja: 'ペーパーアイテム', color: '#1a0d06', accent: '#c9934c' },
]

const ADJECTIVES = [
  'グランド', 'クラシック', 'エレガント', 'ロマンティック', 'モダン',
  'ヴィンテージ', 'プレミアム', 'シンプル', 'ナチュラル', 'ラグジュアリー',
]

const NOUNS: Record<string, string[]> = {
  '花・装飾':         ['ブーケ', 'フラワーアーチ', 'センターピース', 'リース', 'コサージュ', 'ブートニア', 'フラワーシャワー', 'ウォールデコ', 'キャンドルアレンジ', 'ガーランド'],
  '料理':             ['ガラディナー', 'ウェディングビュッフェ', 'コース料理', 'デザートビュッフェ', 'アフタヌーンティー', 'シャンパンタワー', 'ウェルカムドリンク', 'フィンガーフード', 'グルメケータリング', 'シェフテーブル'],
  'ドレス・衣装':     ['ウェディングドレス', 'カラードレス', 'メンズスーツ', 'フラワーガールドレス', 'マザードレス', 'タキシード', '和装', 'カクテルドレス', 'オーバースカート', 'ケープ'],
  '演出':             ['ライトアップ', 'プロジェクションマッピング', 'バルーン演出', 'フラッシュモブ', 'ファーストダンス', 'サプライズムービー', 'スパークラー', 'コンフェッティ', 'ドローン演出', 'プロフィールムービー'],
  '写真・映像':       ['フォトセレモニー', 'シネマ撮影', 'ドローン空撮', 'スナップ撮影', 'フォトブース', 'インスタントプリント', 'アルバム制作', 'エンゲージメント撮影', 'ビデオハイライト', '360°撮影'],
  '会場装飾':         ['テーブルコーディネート', 'チェアデコレーション', 'バックドロップ', 'チュールカーテン', 'ミラーボール', 'ハンギンググリーン', 'ネオンサイン', 'ウェルカムボード', 'フォトプロップス', 'エントランス装飾'],
  'ジュエリー':       ['マリッジリング', 'エンゲージリング', 'ブライダルティアラ', 'ネックレス', 'ブレスレット', 'イヤリング', 'ヘアピン', 'アンクレット', 'ブローチ', 'チャーム'],
  'ヘアメイク':       ['ブライダルヘア', 'メイクアップ', 'アップスタイル', 'ハーフアップ', 'ルーズウェーブ', 'ネイルアート', 'エステコース', 'ビューティーパッケージ', 'スパトリートメント', 'トータルビューティー'],
  '音楽':             ['ストリングカルテット', 'ジャズトリオ', 'ピアノ演奏', 'ゴスペルコーラス', 'DJサービス', 'ハープ演奏', 'バイオリンデュオ', 'アコースティックライブ', 'パーカッションショー', 'アカペラグループ'],
  'ペーパーアイテム': ['招待状セット', '席次表', 'メニュー表', 'プロフィールブック', 'サンキューカード', 'ウェルカムボード', '席札', 'プログラム', 'リボンしおり', 'ギフトタグ'],
}

const EN_NOUNS: Record<string, string[]> = {
  '花・装飾':         ['Bouquet','Floral Arch','Centerpiece','Wreath','Corsage','Boutonniere','Flower Shower','Wall Decor','Candle Arrangement','Garland'],
  '料理':             ['Gala Dinner','Wedding Buffet','Course Meal','Dessert Buffet','Afternoon Tea','Champagne Tower','Welcome Drink','Finger Food','Gourmet Catering','Chef Table'],
  'ドレス・衣装':     ['Wedding Dress','Color Dress','Men Suit','Flower Girl Dress','Mother Dress','Tuxedo','Japanese Outfit','Cocktail Dress','Overskirt','Cape'],
  '演出':             ['Light Up','Projection Mapping','Balloon Show','Flash Mob','First Dance','Surprise Movie','Sparkler','Confetti','Drone Show','Profile Movie'],
  '写真・映像':       ['Photo Ceremony','Cinema Shoot','Drone Aerial','Snap Photo','Photo Booth','Instant Print','Album','Engagement Shoot','Video Highlight','360 Shoot'],
  '会場装飾':         ['Table Coordination','Chair Decoration','Backdrop','Tulle Curtain','Mirror Ball','Hanging Green','Neon Sign','Welcome Board','Photo Props','Entrance Decor'],
  'ジュエリー':       ['Marriage Ring','Engagement Ring','Bridal Tiara','Necklace','Bracelet','Earring','Hair Pin','Anklet','Brooch','Charm'],
  'ヘアメイク':       ['Bridal Hair','Makeup','Upstyle','Half Up','Loose Wave','Nail Art','Beauty Course','Beauty Package','Spa Treatment','Total Beauty'],
  '音楽':             ['String Quartet','Jazz Trio','Piano Solo','Gospel Choir','DJ Service','Harp Solo','Violin Duo','Acoustic Live','Percussion Show','A Cappella'],
  'ペーパーアイテム': ['Invitation Set','Seating Chart','Menu Card','Profile Book','Thank You Card','Welcome Board','Place Card','Program','Ribbon Bookmark','Gift Tag'],
}

const PRICES = [
  '¥8,000', '¥12,000', '¥18,000', '¥25,000', '¥32,000',
  '¥45,000', '¥58,000', '¥78,000', '¥98,000', '¥128,000',
  '¥150,000', '¥200,000', '¥250,000', '¥380,000',
  '¥8,000/名', '¥15,000/名', '¥28,000/名',
  '¥45,000/テーブル', '¥80,000/本', '¥120,000/式',
]

// ─── Generate 100 products ────────────────────────────────────────────────────
function generate(count: number): Product[] {
  const items: Product[] = []
  for (let i = 0; i < count; i++) {
    const cat    = CATEGORIES[i % CATEGORIES.length]
    const adj    = ADJECTIVES[Math.floor(i / CATEGORIES.length) % ADJECTIVES.length]
    const nouns  = NOUNS[cat.ja]
    const enNouns = EN_NOUNS[cat.ja]
    const noun   = nouns[i % nouns.length]
    const enNoun = enNouns[i % enNouns.length]
    const price  = PRICES[i % PRICES.length]
    const pad    = String(i + 1).padStart(3, '0')

    items.push({
      id:          pad,
      name:        `${adj}${noun}`,
      nameEn:      `${enNoun}`,
      category:    cat.ja,
      description: `トランクホテルが厳選した${cat.ja}プラン。${adj}な雰囲気で、ゲストの心に残る特別な体験をお届けします。`,
      price,
      color:       cat.color,
      accentColor: cat.accent,
      imageUrl:    `/images/test/product-${pad}.svg`,
    })
  }
  return items
}

export const products: Product[] = generate(100)
