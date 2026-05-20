import type { IncomingMessage, ServerResponse } from 'node:http'

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

export async function handleImageProxy(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const pathname = req.url?.split('?')[0]
  if (pathname !== '/api/image-proxy' || req.method !== 'GET') {
    return false
  }

  const src = new URL(req.url!, 'http://localhost').searchParams.get('src')
  if (!src || !/^https?:\/\//i.test(src)) {
    res.statusCode = 400
    res.end('Invalid image src')
    return true
  }

  try {
    const upstream = await fetch(src, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WechatMpEditor/1.0)',
        Accept: 'image/*,*/*',
      },
      redirect: 'follow',
    })

    if (!upstream.ok) {
      res.statusCode = upstream.status === 404 ? 404 : 502
      res.end(`Upstream image error: ${upstream.status}`)
      return true
    }

    const buffer = Buffer.from(await upstream.arrayBuffer())
    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg'
    res.statusCode = 200
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.end(buffer)
    return true
  } catch {
    res.statusCode = 502
    res.end('Image proxy failed')
    return true
  }
}
