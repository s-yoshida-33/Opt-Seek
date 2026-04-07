/**
 * Generates 100 SVG placeholder images for product testing.
 * Run: node scripts/gen-test-images.mjs
 * Output: public/images/test/product-001.svg … product-100.svg
 */
import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'public', 'images', 'test')
fs.mkdirSync(OUT, { recursive: true })

// Wedding-themed palette sets  [bg-dark, bg-mid, accent, text]
const PALETTES = [
  ['#1a0d06', '#3d1f0e', '#c9934c', '#f5e0c0'],   // terracotta gold
  ['#0d0a1a', '#1e183d', '#8878cc', '#d8d0f5'],   // lavender violet
  ['#0d1a10', '#1a3520', '#5da86e', '#c8ecd0'],   // sage green
  ['#1a0d12', '#3d1a24', '#d4748c', '#f5c8d8'],   // blush rose
  ['#14100a', '#332818', '#c9a84c', '#f5e8c0'],   // champagne gold
  ['#0a1420', '#14283d', '#5896c8', '#c0daf5'],   // dusty blue
  ['#1a0e0a', '#3d2010', '#d48c5a', '#f5d8c0'],   // warm copper
  ['#120a1a', '#2a1440', '#a068d8', '#e0c8f8'],   // amethyst
  ['#0a1a18', '#143530', '#4ab8a8', '#c0eee8'],   // seafoam teal
  ['#1a1510', '#3d3020', '#b8a070', '#f0e8d8'],   // parchment ivory
]

const CATEGORY_LABELS = [
  '花・装飾', '料理', 'ドレス・衣装', '演出', '写真・映像',
  '会場装飾', 'ジュエリー', 'ヘアメイク', '音楽', 'ペーパーアイテム',
]

const ITEM_NAMES = [
  'Grand Bouquet', 'Ceremony Dinner', 'Couture Dress', 'Light Show',
  'Photo Package', 'Table Setting', 'Diamond Ring', 'Bridal Hair',
  'String Quartet', 'Invitation Suite', 'Floral Arch', 'Wedding Cake',
  'Bridal Veil', 'Champagne Tower', 'Candle Display', 'Tiara',
  'Rose Garden', 'Lantern Wall', 'Photo Booth', 'Silk Ribbon',
]

for (let i = 1; i <= 100; i++) {
  const pad     = String(i).padStart(3, '0')
  const palette = PALETTES[(i - 1) % PALETTES.length]
  const [bg0, bg1, accent, textCol] = palette
  const catLabel  = CATEGORY_LABELS[(i - 1) % CATEGORY_LABELS.length]
  const itemLabel = ITEM_NAMES[(i - 1) % ITEM_NAMES.length]

  // Unique decorative angle per item
  const angle = ((i * 137.5) % 360).toFixed(1)

  const svg = `<svg width="480" height="300" viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="${bg0}"/>
      <stop offset="100%" stop-color="${bg1}"/>
    </linearGradient>
    <linearGradient id="shimmer" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="${accent}" stop-opacity="0"/>
      <stop offset="50%"  stop-color="${accent}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="480" height="300" fill="url(#bg)"/>

  <!-- Shimmer band -->
  <rect width="480" height="300" fill="url(#shimmer)" transform="rotate(${angle}, 240, 150)"/>

  <!-- Outer border -->
  <rect x="12" y="12" width="456" height="276"
        fill="none" stroke="${accent}" stroke-width="0.8" opacity="0.35"/>

  <!-- Inner border -->
  <rect x="22" y="22" width="436" height="256"
        fill="none" stroke="${accent}" stroke-width="0.4" opacity="0.20"/>

  <!-- Corner ornaments -->
  <g stroke="${accent}" stroke-width="0.8" fill="none" opacity="0.55">
    <path d="M12,36 L12,12 L36,12"/>
    <path d="M444,12 L468,12 L468,36"/>
    <path d="M468,264 L468,288 L444,288"/>
    <path d="M36,288 L12,288 L12,264"/>
  </g>

  <!-- Category label -->
  <text x="240" y="98"
        font-family="'Hiragino Mincho ProN', 'Yu Mincho', Georgia, serif"
        font-size="11" fill="${accent}" opacity="0.65"
        text-anchor="middle" letter-spacing="3">
    ${catLabel}
  </text>

  <!-- Item number (large) -->
  <text x="240" y="162"
        font-family="'Cormorant Garamond', 'Didot', Georgia, serif"
        font-size="56" font-weight="300" fill="${textCol}" opacity="0.80"
        text-anchor="middle" dominant-baseline="middle">
    ${pad}
  </text>

  <!-- English name -->
  <text x="240" y="208"
        font-family="'Cormorant Garamond', Georgia, serif"
        font-size="13" font-weight="300" fill="${textCol}" opacity="0.50"
        text-anchor="middle" letter-spacing="2">
    ${itemLabel}
  </text>

  <!-- Horizontal rule -->
  <line x1="180" y1="225" x2="300" y2="225"
        stroke="${accent}" stroke-width="0.5" opacity="0.30"/>
</svg>`

  fs.writeFileSync(path.join(OUT, `product-${pad}.svg`), svg, 'utf8')
}

console.log(`✓ Generated 100 SVG placeholders → public/images/test/`)
