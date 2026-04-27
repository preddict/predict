'use client'

import { useState } from 'react'
import Image, { type ImageProps } from 'next/image'
import { getFallbackPhoto } from '@/lib/marketUtils'

interface MarketImageProps extends Omit<ImageProps, 'onError'> {
  category: string
  marketId: string
}

export function MarketImage({ category, marketId, src, alt, ...props }: MarketImageProps) {
  const fallback = getFallbackPhoto(category, marketId)
  const [imgSrc, setImgSrc] = useState(src)

  return (
    <Image
      {...props}
      src={imgSrc}
      alt={alt}
      onError={() => setImgSrc(fallback)}
      unoptimized
    />
  )
}
