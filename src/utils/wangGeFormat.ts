import type { LayoutStyleTheme } from '../config/layoutStyles'
import { isValidGoldenQuoteLine } from './literaryQuoteFix'
import { buildContentBlocks, type ContentBlock } from './articleImages'
import { toPreviewImageSrc } from './previewImageUrl'
import type { LayoutRenderParams } from './layoutEngine'

const FONT =
  "'PingFang SC','Microsoft YaHei','Hiragino Sans GB',serif,sans-serif"

const PAGE_PADDING = 16
const IMAGE_MARGIN = 25

export type WangGeRenderOptions = {
  blocks?: ContentBlock[]
  layoutParams?: LayoutRenderParams
  engagementHtml?: string
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatInline(raw: string, theme: LayoutStyleTheme): string {
  let s = escapeHtml(raw)
  s = s.replace(
    /==([^=]+)==/g,
    `<span style="color:${theme.accent};font-weight:600;">$1</span>`,
  )
  s = s.replace(/\*\*([^*]+)\*\*/g, `<strong style="color:${theme.text};font-weight:600;">$1</strong>`)
  s = s.replace(/~~([^~]+)~~/g, `<del style="color:${theme.muted};">$1</del>`)
  s = s.replace(
    /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
    `<em style="color:${theme.muted};font-style:italic;">$1</em>`,
  )
  return s
}

function isDividerLine(line: string): boolean {
  const t = line.trim()
  return /^[·．]{3,}\s*$/.test(t) || t === '·····'
}

function isSectionHeading(line: string): boolean {
  return /^[｜│]/.test(line.trim())
}

function isQuoteLine(line: string): boolean {
  return /^❙/.test(line.trim())
}

function isEndSymbol(line: string): boolean {
  return /^✦\s*$/.test(line.trim())
}

function isPastLink(line: string): boolean {
  return /^·\s/.test(line.trim())
}

function isAuthorLine(line: string): boolean {
  return /^文字\s*[|｜]/.test(line.trim())
}

export function renderWangGeArticleHtml(
  title: string,
  body: string,
  theme: LayoutStyleTheme,
  imageEnabled = false,
  _styleMetaLabel?: string,
  options?: WangGeRenderOptions,
): string {
  const params = options?.layoutParams
  const lh = params?.lineHeight ?? 1.85
  const ls = params?.letterSpacing ?? 1
  const pg = params?.paragraphGap ?? 18

  const bodyStyle = `font-size:15px;font-weight:400;color:${theme.text};line-height:${lh};letter-spacing:${ls}px;margin:0 0 ${pg}px;text-align:justify;`
  const blocks = options?.blocks ?? buildContentBlocks(body, imageEnabled)
  const parts: string[] = []
  let sawDivider = false
  let sawAuthorLine = false
  let blockIndex = 0

  for (const block of blocks) {
    if (block.type === 'image') {
      parts.push(
        renderImageSlot(block, theme, {
          url: block.url,
          borderRadius: block.borderRadius ?? 5,
          widthPercent: block.widthPercent ?? 100,
        }),
      )
      continue
    }

    const lines = block.text.split('\n')
    let i = 0
    while (i < lines.length) {
      const line = lines[i]
      const trimmed = line.trim()

      if (!trimmed) {
        i += 1
        continue
      }

      if (isDividerLine(trimmed)) {
        parts.push(renderDivider(theme))
        sawDivider = true
        i += 1
        continue
      }

      if (isSectionHeading(trimmed)) {
        const text = trimmed.replace(/^[｜│]\s*/, '')
        parts.push(renderSectionHeading(text, theme))
        i += 1
        continue
      }

      if (isQuoteLine(trimmed)) {
        const text = trimmed.replace(/^❙\s*/, '')
        parts.push(renderQuote(text, theme))
        i += 1
        continue
      }

      if (isEndSymbol(trimmed)) {
        parts.push(renderEndSymbol(theme))
        i += 1
        continue
      }

      if (isPastLink(trimmed)) {
        parts.push(renderPastLink(trimmed.slice(1).trim(), theme))
        i += 1
        continue
      }

      if (isAuthorLine(trimmed)) {
        parts.push(renderAuthorLine(trimmed, theme))
        sawAuthorLine = true
        i += 1
        continue
      }

      if (!sawDivider && blockIndex === 0 && parts.length === 0 && isValidGoldenQuoteLine(trimmed)) {
        parts.push(renderOpenQuote(trimmed, theme))
        i += 1
        continue
      }

      if (
        sawAuthorLine &&
        !isPastLink(trimmed) &&
        !isEndSymbol(trimmed) &&
        trimmed.length < 36 &&
        !trimmed.startsWith('·')
      ) {
        parts.push(renderAuthorBio(trimmed, theme))
        sawAuthorLine = false
        i += 1
        continue
      }

      const paraLines: string[] = [line]
      i += 1
      while (i < lines.length) {
        const next = lines[i].trim()
        if (
          !next ||
          isDividerLine(next) ||
          isSectionHeading(next) ||
          isQuoteLine(next) ||
          isEndSymbol(next) ||
          isPastLink(next) ||
          isAuthorLine(next)
        ) {
          break
        }
        paraLines.push(lines[i])
        i += 1
      }

      const joined = paraLines.join('\n').trim()
      for (const pl of joined.split('\n').filter((l) => l.trim())) {
        parts.push(`<p style="${bodyStyle}">${formatInline(pl.trim(), theme)}</p>`)
      }
    }
    blockIndex += 1
  }

  const bodyHtml =
    parts.join('') ||
    `<p style="${bodyStyle}color:${theme.muted};">排版预览将在此显示…</p>`

  const engagement = options?.engagementHtml ?? ''

  return `
    <article style="font-family:${FONT};background:${theme.background};padding:${PAGE_PADDING}px;max-width:100%;box-sizing:border-box;">
      <h1 style="font-size:18px;font-weight:700;color:${theme.text};line-height:1.5;margin:0 0 ${pg}px;letter-spacing:${ls}px;text-align:left;">${escapeHtml(title || '未命名文章')}</h1>
      ${bodyHtml}
      ${engagement}
    </article>
  `.trim()
}

function renderOpenQuote(text: string, theme: LayoutStyleTheme): string {
  return `<p style="font-size:18px;font-weight:700;color:${theme.accent};line-height:1.6;letter-spacing:1px;margin:0 0 20px;text-align:center;">${formatInline(text, theme)}</p>`
}

function renderDivider(theme: LayoutStyleTheme): string {
  return `<p style="font-size:14px;color:${theme.muted};line-height:1.5;letter-spacing:6px;margin:0 0 20px;text-align:center;">·····</p>`
}

function renderSectionHeading(text: string, theme: LayoutStyleTheme): string {
  return `<p style="font-size:16px;font-weight:700;color:${theme.accent};line-height:1.5;letter-spacing:1px;margin:24px 0 16px;">｜${formatInline(text, theme)}</p>`
}

function renderQuote(text: string, theme: LayoutStyleTheme): string {
  return `<p style="font-size:13px;color:${theme.muted};font-style:italic;line-height:1.75;letter-spacing:1px;margin:0 0 16px;padding-left:12px;border-left:2px solid ${theme.muted};">❙ ${formatInline(text, theme)}</p>`
}

function renderEndSymbol(theme: LayoutStyleTheme): string {
  return `<p style="font-size:16px;font-weight:700;color:${theme.accent};line-height:1.5;margin:28px 0 16px;text-align:center;">✦</p>`
}

function renderAuthorLine(text: string, theme: LayoutStyleTheme): string {
  return `<p style="font-size:13px;color:${theme.muted};line-height:1.75;margin:20px 0 6px;text-align:center;">${formatInline(text, theme)}</p>`
}

function renderAuthorBio(text: string, theme: LayoutStyleTheme): string {
  return `<p style="font-size:13px;color:${theme.muted};line-height:1.75;margin:0 0 16px;text-align:center;">${formatInline(text, theme)}</p>`
}

function renderPastLink(text: string, theme: LayoutStyleTheme): string {
  return `<p style="font-size:14px;color:${theme.text};line-height:1.75;margin:0 0 10px;text-align:center;">· ${formatInline(text, theme)}</p>`
}

function renderImageSlot(
  block: Extract<ContentBlock, { type: 'image' }>,
  theme: LayoutStyleTheme,
  extra?: { url?: string; borderRadius?: number; widthPercent?: number },
): string {
  const caption = block.caption
  const isPlaceholder = block.isPlaceholder
  const url = toPreviewImageSrc(extra?.url)
  const radius = extra?.borderRadius ?? 5
  const width = extra?.widthPercent ?? 100
  const centerLabel = isPlaceholder ? '配图占位' : url ? '' : '待生成配图'
  const bg = isPlaceholder
    ? `linear-gradient(145deg,${theme.background},${theme.muted}22)`
    : '#eeeeee'
  const showCaption = block.index === 0 && caption.trim().length > 0

  const inner = url
    ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(caption || '配图')}" referrerpolicy="no-referrer" decoding="async" style="display:block;width:100%;height:100%;object-fit:cover;min-height:120px;filter:saturate(0.85) contrast(0.95);" onerror="this.onerror=null;this.style.objectFit='contain';this.alt='配图加载失败';" />`
    : `<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:${theme.muted};font-size:13px;padding:12px;text-align:center;">${escapeHtml(centerLabel)}</span>`

  const figcaption = showCaption
    ? `<figcaption style="font-size:13px;color:${theme.muted};text-align:center;margin-top:10px;line-height:1.5;letter-spacing:0.5px;font-style:italic;">${escapeHtml(caption)}</figcaption>`
    : ''

  return `
    <figure style="margin:${IMAGE_MARGIN}px 0;text-align:center;">
      <div style="display:block;width:${width}%;margin:0 auto;aspect-ratio:16/9;border-radius:${radius}px;overflow:hidden;background:${bg};position:relative;">
        ${inner}
      </div>
      ${figcaption}
    </figure>
  `.trim()
}
