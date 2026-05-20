import { isNativeApp } from './platform'

/** 将外链图转为本地代理地址，避免豆包/CDN 防盗链导致预览空白 */
export function toPreviewImageSrc(url: string | undefined): string | undefined {
  if (!url?.trim()) return undefined
  const u = url.trim()
  if (u.startsWith('data:') || u.startsWith('/api/image-proxy')) return u
  if (isNativeApp()) return u
  if (/^https?:\/\//i.test(u)) {
    return `/api/image-proxy?src=${encodeURIComponent(u)}`
  }
  return u
}
/** 已生成的 HTML 在展示前把外链图改为本地代理 */
export function rewriteHtmlImagesForPreview(html: string): string {
  return html.replace(
    /(<img[^>]*\ssrc=["'])([^"']+)(["'][^>]*>)/gi,
    (full, prefix, src, suffix) => {
      const preview = toPreviewImageSrc(src)
      if (!preview || preview === src) return full
      return `${prefix}${preview}${suffix}`
    },
  )
}

export function resolveOriginalImageUrl(src: string): string {
  const trimmed = src.trim()
  if (!trimmed.startsWith('/api/image-proxy')) return trimmed
  try {
    const real = new URL(trimmed, 'http://localhost').searchParams.get('src')
    if (real) return decodeURIComponent(real)
  } catch {
    // ignore
  }
  return trimmed
}
