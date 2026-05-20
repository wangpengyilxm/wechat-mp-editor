import { splitParagraphs } from './articleImages'

export type SegmentMarkStyle = 'highlight' | 'bold' | 'strike' | 'italic'

export type SegmentMark = {
  paragraph: number
  keyword: string
  style: SegmentMarkStyle
}

const STYLE_WRAP: Record<SegmentMarkStyle, [string, string]> = {
  highlight: ['==', '=='],
  bold: ['**', '**'],
  strike: ['~~', '~~'],
  italic: ['*', '*'],
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function wrapKeywordOnce(text: string, keyword: string, style: SegmentMarkStyle): string {
  if (!keyword.trim() || text.includes(STYLE_WRAP[style][0] + keyword)) return text
  const re = new RegExp(escapeRegExp(keyword), 'u')
  const [open, close] = STYLE_WRAP[style]
  return text.replace(re, `${open}$&${close}`)
}

/** 将 AI 识别的标记应用到正文（按段落） */
export function applySegmentMarks(body: string, marks: SegmentMark[]): string {
  const paragraphs = splitParagraphs(body)
  if (paragraphs.length === 0) return body

  const byPara = new Map<number, SegmentMark[]>()
  for (const m of marks) {
    if (m.paragraph < 0 || m.paragraph >= paragraphs.length) continue
    const list = byPara.get(m.paragraph) ?? []
    if (list.length >= 2) continue
    if (list.some((x) => x.keyword === m.keyword)) continue
    list.push(m)
    byPara.set(m.paragraph, list)
  }

  const next = paragraphs.map((para, i) => {
    const paraMarks = byPara.get(i) ?? []
    let out = para
    for (const mark of paraMarks) {
      out = wrapKeywordOnce(out, mark.keyword, mark.style)
    }
    return out
  })

  return next.join('\n\n')
}

export function pickMarkStylesForEngine(): SegmentMarkStyle[] {
  return ['highlight', 'italic', 'bold']
}
