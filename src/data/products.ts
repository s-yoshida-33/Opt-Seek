export interface Product {
  id: string
  name: string
  nameEn: string
  category: string
  description: string
  price: string
  color: string
  accentColor: string
}

export const products: Product[] = [
  {
    id: '001',
    name: 'グランドブーケ',
    nameEn: 'Grand Bouquet',
    category: '花・装飾',
    description: '季節の花々を贅沢に束ねた、永遠の愛を象徴するウェディングブーケ。白いバラとユーカリの組み合わせが、エレガントな美しさを演出します。',
    price: '¥58,000',
    color: '#1a0533',
    accentColor: '#c084fc',
  },
  {
    id: '002',
    name: 'セレモニーディナー',
    nameEn: 'Ceremony Dinner',
    category: '料理',
    description: 'シェフが厳選した食材で彩る、5コースのガラディナー。ゲストの心に残る、至高の食体験をお届けします。',
    price: '¥28,000/名',
    color: '#0c1f0e',
    accentColor: '#4ade80',
  },
  {
    id: '003',
    name: 'クチュールドレス',
    nameEn: 'Couture Dress',
    category: 'ドレス',
    description: 'パリコレクションで活躍するデザイナーによる、オートクチュールウェディングドレス。花嫁の美しさを最大限に引き出すシルエット。',
    price: '¥380,000',
    color: '#1a0c00',
    accentColor: '#fb923c',
  },
  {
    id: '004',
    name: 'テーブルコーディネート',
    nameEn: 'Table Coordination',
    category: '花・装飾',
    description: 'アンティーク調のキャンドルスタンドと生花を組み合わせた、ロマンティックなテーブルデコレーション。',
    price: '¥45,000/テーブル',
    color: '#0a1929',
    accentColor: '#38bdf8',
  },
  {
    id: '005',
    name: 'ウェディングケーキ',
    nameEn: 'Wedding Cake',
    category: '料理',
    description: '5段重ねのカスタムウェディングケーキ。繊細なシュガーフラワーで装飾された、芸術的な逸品。',
    price: '¥85,000',
    color: '#1f0a1a',
    accentColor: '#f472b6',
  },
  {
    id: '006',
    name: 'ライトアップ演出',
    nameEn: 'Light Performance',
    category: '演出',
    description: 'プロジェクションマッピングとLEDライトを組み合わせた、幻想的な空間演出。二人だけの特別な世界を創り出します。',
    price: '¥120,000',
    color: '#0d0d1f',
    accentColor: '#818cf8',
  },
  {
    id: '007',
    name: 'プレミアムシャンパン',
    nameEn: 'Premium Champagne',
    category: '料理',
    description: 'フランス・シャンパーニュ地方の銘醸ドム・ペリニョン。特別な乾杯のための最高級シャンパン。',
    price: '¥48,000/本',
    color: '#1a1500',
    accentColor: '#fbbf24',
  },
  {
    id: '008',
    name: 'フォトセレモニー',
    nameEn: 'Photo Ceremony',
    category: '演出',
    description: '一流カメラマンによる、映画のような結婚式の記録。二人の永遠の思い出を芸術写真として残します。',
    price: '¥250,000',
    color: '#0a1a1a',
    accentColor: '#2dd4bf',
  },
]
