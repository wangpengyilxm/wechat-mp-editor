import { resolveOriginalImageUrl } from './imageProxy'

/**
 * 微信公众号草稿箱同步（服务端调用，避免在前端暴露 AppSecret）
 * @see https://developers.weixin.qq.com/doc/offiaccount/Draft_Box/Add_draft.html
 */

const TOKEN_URL = 'https://api.weixin.qq.com/cgi-bin/token'
const DRAFT_ADD_URL = 'https://api.weixin.qq.com/cgi-bin/draft/add'
const UPLOAD_IMG_URL = 'https://api.weixin.qq.com/cgi-bin/media/uploadimg'
const ADD_MATERIAL_URL = 'https://api.weixin.qq.com/cgi-bin/material/add_material'

/** 900×500 灰色封面占位（JPEG） */
const FALLBACK_COVER_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCABkAGQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==',
  'base64',
)

type TokenCache = { token: string; expiresAt: number }
const tokenCache = new Map<string, TokenCache>()

export type SyncDraftInput = {
  appId: string
  appSecret: string
  title: string
  html: string
  author?: string
}

export type SyncDraftResult = {
  draftMediaId: string
}

export class WechatApiError extends Error {
  constructor(
    public readonly errcode: number,
    errmsg: string,
  ) {
    super(formatWechatError(errcode, errmsg))
    this.name = 'WechatApiError'
  }
}

function formatWechatError(errcode: number, errmsg: string): string {
  const map: Record<number, string> = {
    40001: 'AppSecret 错误或 access_token 无效，请检查公众号配置',
    40013: 'AppID 无效，请检查公众号 AppID',
    40164: '服务器 IP 未加入公众号白名单，请在微信公众平台「开发 → 基本配置 → IP 白名单」添加本机公网 IP',
    45009: '接口调用超过限制，请稍后再试',
    53402: '封面图片尺寸不符合要求，请确保文章含可访问配图或稍后重试',
  }
  const hint = map[errcode]
  return hint ? `${hint}（${errcode}: ${errmsg}）` : `微信接口错误 ${errcode}: ${errmsg}`
}

async function wechatJson<T extends { errcode?: number; errmsg?: string }>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, init)
  const data = (await res.json()) as T
  if (data.errcode && data.errcode !== 0) {
    throw new WechatApiError(data.errcode, data.errmsg ?? 'unknown')
  }
  return data
}

async function getAccessToken(appId: string, appSecret: string): Promise<string> {
  const cached = tokenCache.get(appId)
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token
  }

  const url = `${TOKEN_URL}?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`
  const data = await wechatJson<{ access_token: string; expires_in: number }>(url)
  tokenCache.set(appId, {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  })
  return data.access_token
}

async function downloadBinary(
  url: string,
): Promise<{ buffer: Buffer; mime: string; filename: string }> {
  const resolved = resolveOriginalImageUrl(url)

  if (resolved.startsWith('data:')) {
    const match = /^data:([^;]+);base64,(.+)$/i.exec(resolved)
    if (!match) throw new Error('无效的图片 data URL')
    const mime = match[1] || 'image/png'
    const buffer = Buffer.from(match[2]!, 'base64')
    const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg'
    return { buffer, mime, filename: `image.${ext}` }
  }

  const res = await fetch(resolved)
  if (!res.ok) {
    throw new Error(`无法下载图片：${url}（HTTP ${res.status}）`)
  }
  const mime = res.headers.get('content-type') ?? 'image/jpeg'
  const buffer = Buffer.from(await res.arrayBuffer())
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg'
  return { buffer, mime, filename: `image.${ext}` }
}

function buildMultipart(
  buffer: Buffer,
  filename: string,
  mime: string,
): { body: Buffer; contentType: string } {
  const boundary = `----WechatSync${Date.now()}`
  const header = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="media"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`,
  )
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`)
  return {
    body: Buffer.concat([header, buffer, footer]),
    contentType: `multipart/form-data; boundary=${boundary}`,
  }
}

async function uploadPermanentImage(
  accessToken: string,
  buffer: Buffer,
  filename: string,
  mime: string,
): Promise<string> {
  const { body, contentType } = buildMultipart(buffer, filename, mime)
  const url = `${ADD_MATERIAL_URL}?access_token=${encodeURIComponent(accessToken)}&type=image`
  const data = await wechatJson<{ media_id: string }>(url, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body,
  })
  return data.media_id
}

async function uploadContentImage(accessToken: string, imageUrl: string): Promise<string> {
  const { buffer, mime, filename } = await downloadBinary(imageUrl)
  const { body, contentType } = buildMultipart(buffer, filename, mime)
  const url = `${UPLOAD_IMG_URL}?access_token=${encodeURIComponent(accessToken)}`
  const data = await wechatJson<{ url: string }>(url, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body,
  })
  return data.url
}

function extractImageUrls(html: string): string[] {
  const urls: string[] = []
  const re = /<img[^>]+src=["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    let src = m[1]!.trim()
    if (!src) continue
    src = resolveOriginalImageUrl(src)
    if (src.startsWith('data:')) {
      if (!urls.includes(src)) urls.push(src)
      continue
    }
    if (src.includes('mmbiz.qpic.cn')) continue
    if (!urls.includes(src)) urls.push(src)
  }
  return urls
}

async function processHtmlImages(html: string, accessToken: string): Promise<string> {
  const imgRe = /<img([^>]*)\ssrc=["']([^"']+)["']([^>]*)>/gi
  const replacements: { from: string; to: string }[] = []
  const seen = new Set<string>()

  let match: RegExpExecArray | null
  while ((match = imgRe.exec(html)) !== null) {
    const srcAttr = match[2]!
    if (seen.has(srcAttr)) continue
    seen.add(srcAttr)

    const resolved = resolveOriginalImageUrl(srcAttr)
    if (resolved.includes('mmbiz.qpic.cn')) continue

    try {
      const wxUrl = await uploadContentImage(accessToken, resolved)
      replacements.push({ from: srcAttr, to: wxUrl })
    } catch {
      // 单张失败不阻断
    }
  }

  let result = html
  for (const { from, to } of replacements) {
    result = result.split(from).join(to)
  }
  return result
}

async function resolveThumbMediaId(
  accessToken: string,
  html: string,
): Promise<string> {
  const firstImg = extractImageUrls(html)[0]
  if (firstImg) {
    try {
      const { buffer, mime, filename } = await downloadBinary(firstImg)
      return await uploadPermanentImage(accessToken, buffer, filename, mime)
    } catch {
      // fallback below
    }
  }
  return uploadPermanentImage(
    accessToken,
    FALLBACK_COVER_JPEG,
    'cover.jpg',
    'image/jpeg',
  )
}

function buildDigest(html: string): string {
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, '')
    .trim()
  return text.slice(0, 120) || ' '
}

export async function syncArticleToWechatDraft(
  input: SyncDraftInput,
): Promise<SyncDraftResult> {
  const appId = input.appId.trim()
  const appSecret = input.appSecret.trim()
  const title = input.title.trim() || '未命名文章'

  if (!appId || !appSecret) {
    throw new Error('请先在「设置 → 公众号链接」中填写 AppID 与 AppSecret')
  }
  if (!input.html.trim()) {
    throw new Error('暂无排版内容，请先生成文章')
  }

  const accessToken = await getAccessToken(appId, appSecret)
  const content = await processHtmlImages(input.html, accessToken)
  const thumbMediaId = await resolveThumbMediaId(accessToken, input.html)
  const digest = buildDigest(content)

  const url = `${DRAFT_ADD_URL}?access_token=${encodeURIComponent(accessToken)}`
  const data = await wechatJson<{ media_id: string }>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      articles: [
        {
          article_type: 'news',
          title,
          author: input.author?.trim() || '王哥',
          digest,
          content,
          content_source_url: '',
          thumb_media_id: thumbMediaId,
          need_open_comment: 0,
          only_fans_can_comment: 0,
        },
      ],
    }),
  })

  return { draftMediaId: data.media_id }
}
