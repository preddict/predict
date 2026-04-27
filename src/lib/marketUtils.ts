// Category fallback photos — curated Unsplash photos (free to use)
const FALLBACK_PHOTOS: Record<string, string[]> = {
  politics: [
    'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1545126931-8e4bff9b4c15?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1555848962-6e79363ec58f?w=600&q=80&fit=crop',
  ],
  crypto: [
    'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1607799279861-4dd421407f5c?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&q=80&fit=crop',
  ],
  sports: [
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&q=80&fit=crop',
  ],
  economy: [
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1559526324-593bc073d938?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&q=80&fit=crop',
  ],
  technology: [
    'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=600&q=80&fit=crop',
  ],
  entertainment: [
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&q=80&fit=crop',
  ],
  world: [
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?w=600&q=80&fit=crop',
  ],
  weather: [
    'https://images.unsplash.com/photo-1504253163759-c23fccaebb55?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1527482937786-6608f6e14c15?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1561553873-e8491a564fd0?w=600&q=80&fit=crop',
  ],
}

// Returns true if the URL points to a real photo (not an SVG icon or logo-type image)
export function isRealPhoto(url: string | null | undefined): boolean {
  if (!url) return false
  const lower = url.toLowerCase()
  if (lower.endsWith('.svg') || lower.includes('.svg?')) return false
  if (lower.includes('/icon') || lower.includes('/logo') || lower.includes('/symbol')) return false
  return true
}

// Returns a consistent fallback photo for a market (deterministic via id hash)
export function getFallbackPhoto(category: string, marketId: string): string {
  const pool = FALLBACK_PHOTOS[category] || FALLBACK_PHOTOS.world
  // Pick deterministically based on the last 2 chars of market id
  const idx = parseInt(marketId.slice(-2), 16) % pool.length
  return pool[idx]
}

// Returns the best image URL for a market
export function getMarketImage(market: { image_url?: string | null; category: string; id: string }): string {
  if (isRealPhoto(market.image_url)) return market.image_url!
  return getFallbackPhoto(market.category, market.id)
}

// Strips common leading question words from market titles
export function cleanTitle(title: string): string {
  return title
    .replace(/^Will\s+/i, '')
    .replace(/^Does\s+/i, '')
    .trim()
}
