import { createReadStream, existsSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleImageProxy } from './imageProxy'
import { syncArticleToWechatDraft } from './wechatDraft'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw ? JSON.parse(raw) : {})
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

async function handleSyncDraft(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = (await readJsonBody(req)) as Record<string, unknown>
    const result = await syncArticleToWechatDraft({
      appId: String(body.appId ?? ''),
      appSecret: String(body.appSecret ?? ''),
      title: String(body.title ?? ''),
      html: String(body.html ?? ''),
      author: body.author ? String(body.author) : undefined,
    })
    sendJson(res, 200, { ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : '同步失败'
    sendJson(res, 400, { ok: false, message })
  }
}

function safePath(staticRoot: string, urlPath: string): string | null {
  const decoded = decodeURIComponent(urlPath.split('?')[0] ?? '/')
  const relative = decoded === '/' ? '/index.html' : decoded
  const normalized = join(staticRoot, relative).replace(/\\/g, '/')
  const root = join(staticRoot).replace(/\\/g, '/')
  if (!normalized.startsWith(root)) return null
  return normalized
}

function serveStatic(
  req: IncomingMessage,
  res: ServerResponse,
  staticRoot: string,
): boolean {
  const filePath = safePath(staticRoot, req.url ?? '/')
  if (!filePath || !existsSync(filePath)) {
    const indexPath = join(staticRoot, 'index.html')
    if (existsSync(indexPath)) {
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      createReadStream(indexPath).pipe(res)
      return true
    }
    res.statusCode = 404
    res.end('Not Found')
    return true
  }

  const stat = statSync(filePath)
  if (stat.isDirectory()) {
    const indexInDir = join(filePath, 'index.html')
    if (existsSync(indexInDir)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      createReadStream(indexInDir).pipe(res)
      return true
    }
    res.statusCode = 404
    res.end('Not Found')
    return true
  }

  const ext = extname(filePath)
  res.statusCode = 200
  res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream')
  createReadStream(filePath).pipe(res)
  return true
}

/** 统一处理 API + 静态资源（Electron 安装版与开发服务器共用） */
export async function handleHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  staticRoot?: string,
): Promise<void> {
  const pathname = req.url?.split('?')[0] ?? ''

  if (req.method === 'GET' && pathname === '/api/image-proxy') {
    const handled = await handleImageProxy(req, res)
    if (handled) return
  }

  if (req.method === 'POST' && pathname === '/api/wechat/sync-draft') {
    await handleSyncDraft(req, res)
    return
  }

  if (staticRoot && req.method === 'GET') {
    serveStatic(req, res, staticRoot)
    return
  }

  res.statusCode = 404
  res.end('Not Found')
}
