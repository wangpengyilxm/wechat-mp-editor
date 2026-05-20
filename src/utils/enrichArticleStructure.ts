import type { LayoutStyleId } from '../config/layoutStyles'
import { LAYOUT_STYLE_SPECS } from '../config/layoutStyleWriting'
import {
  isCanonicalOverusedQuote,
  isValidGoldenQuoteLine,
  removeLeadingOverlap,
  splitGluedOpenQuote,
} from './literaryQuoteFix'

function splitBlocks(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
}

function joinBlocks(blocks: string[]): string {
  return blocks.join('\n\n').trim()
}

function insertBlock(blocks: string[], index: number, block: string): string[] {
  const i = Math.min(Math.max(0, index), blocks.length)
  return [...blocks.slice(0, i), block, ...blocks.slice(i)]
}

export function countSectionHeadings(body: string): number {
  return (body.match(/^[｜│]/gm) ?? []).length
}

export function countLiteraryDividers(body: string): number {
  return (body.match(/^[·．]{3,}\s*$/gm) ?? []).length
}

export function countQuoteBlocks(body: string): number {
  return (body.match(/^❙/gm) ?? []).length
}

function isStructuralBlock(block: string): boolean {
  const t = block.trim()
  if (/^[｜│]/.test(t)) return true
  if (/^[·．]{3,}\s*$/.test(t)) return true
  if (/^❙/.test(t)) return true
  if (/^✦\s*$/.test(t)) return true
  if (/^·\s/.test(t)) return true
  if (/^文字\s*[|｜]/.test(t)) return true
  if (/^#{1,3}\s/.test(t)) return true
  return false
}

function proseBlocks(blocks: string[]): string[] {
  return blocks.filter((b) => !isStructuralBlock(b))
}

function hashPickQuote(seed: string, items: string[]): string {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) h = (h << 5) - h + seed.charCodeAt(i)
  return items[Math.abs(h) % items.length]!
}

const OPEN_QUOTE_POOL = [
  '有些感受，当时不懂，过几年就懂了。',
  '不是所有告别，都需要一个仪式。',
  '人这一生，总要学会独自走完某段路。',
  '关系变淡的时候，往往没有争吵。',
  '后来才发现，沉默也是一种答案。',
  '有些温暖，隔着屏幕也能传过来。',
  '成年人的默契，有时是不再打扰。',
  '我们都曾在某个人身上，看见过自己。',
]

function normalizeHeadingLine(line: string): string {
  const t = line.trim()
  const md = t.match(/^#{1,3}\s+(.+)$/)
  if (md) return `｜${md[1].replace(/^\d+[.、．]\s*/, '')}`
  if (/^[｜│]/.test(t)) return t.startsWith('│') ? `｜${t.slice(1).trim()}` : t
  return `｜${t}`
}

function convertLegacyMarkers(body: string): string {
  return body
    .split('\n')
    .map((line) => {
      const t = line.trim()
      if (/^#{1,3}\s/.test(t)) return normalizeHeadingLine(t)
      if (t === '---' || t === '✨' || /^✨\s/.test(t)) return '·····'
      if (/^[💡⚠️✅💬]/.test(t)) return ''
      if (t.includes('┌') || t.includes('│') && t.includes('└')) return ''
      return line
    })
    .filter((line, i, arr) => {
      if (line !== '') return true
      return i > 0 && arr[i - 1] !== ''
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
}

function pickFallbackQuote(blocks: string[], spec: (typeof LAYOUT_STYLE_SPECS)[LayoutStyleId]): string {
  const seed = blocks.join('').slice(0, 200)
  const pool = OPEN_QUOTE_POOL.filter((q) => q !== spec.openQuoteFallback)
  return hashPickQuote(seed, pool.length > 0 ? pool : OPEN_QUOTE_POOL)
}

function ensureOpenQuote(blocks: string[], spec: (typeof LAYOUT_STYLE_SPECS)[LayoutStyleId]): string[] {
  if (blocks.length === 0) {
    return [pickFallbackQuote(blocks, spec), spec.dividerText]
  }

  let first = blocks[0]!.trim()
  if (/^[｜│❙✦·]/.test(first) || /^[·．]{3,}/.test(first)) {
    return insertBlock(blocks, 0, pickFallbackQuote(blocks, spec))
  }

  let quote = first
  let rest = ''

  if (!isValidGoldenQuoteLine(first)) {
    const split = splitGluedOpenQuote(first)
    quote = split.quote
    rest = split.rest
  }

  if (isCanonicalOverusedQuote(quote)) {
    quote = pickFallbackQuote(blocks, spec)
  }

  const rebuilt: string[] = [quote]
  if (rest) rebuilt.push(rest)

  let idx = 1
  while (idx < blocks.length) {
    const block = blocks[idx]!
    if (/^[·．]{3,}\s*$/.test(block.trim()) || block.trim() === '·····') {
      idx += 1
      continue
    }
    const cleaned = removeLeadingOverlap(joinBlocks(rebuilt), block)
    if (cleaned) rebuilt.push(cleaned)
    idx += 1
  }

  return rebuilt
}

function ensureDividerAfterQuote(blocks: string[], spec: (typeof LAYOUT_STYLE_SPECS)[LayoutStyleId]): string[] {
  if (countLiteraryDividers(joinBlocks(blocks)) > 0) return blocks
  return insertBlock(blocks, 1, spec.dividerText)
}

function ensureSectionHeadings(blocks: string[], layoutId: LayoutStyleId): string[] {
  const spec = LAYOUT_STYLE_SPECS[layoutId]
  let result = [...blocks]
  const existing = countSectionHeadings(joinBlocks(result))
  const need = Math.max(0, Math.min(spec.maxSectionHeadings, spec.minSectionHeadings) - existing)
  const canAdd = Math.max(0, spec.maxSectionHeadings - existing)
  const toAdd = Math.min(need, canAdd)

  for (let i = 0; i < toAdd; i += 1) {
    const pos = spec.sectionHeadingPositions[i] ?? 0.3 + i * 0.22
    const idx = Math.max(2, Math.min(result.length - 1, Math.floor(result.length * pos)))
    const label = spec.sectionHeadingLabels[i] ?? '说到这里'
    result = insertBlock(result, idx, `｜${label}`)
  }
  return result
}

function ensureQuoteBlocks(body: string, layoutId: LayoutStyleId): string {
  const spec = LAYOUT_STYLE_SPECS[layoutId]
  let count = countQuoteBlocks(body)
  if (count >= spec.minQuoteBlocks) return body

  const blocks = splitBlocks(body)
  const prose = proseBlocks(blocks).filter((b) => !/^[·．]{3,}/.test(b.trim()))
  let need = spec.minQuoteBlocks - count
  let result = body

  for (const block of prose) {
    if (need <= 0 || countQuoteBlocks(result) >= spec.maxQuoteBlocks) break
    if (block.includes('❙')) continue
    const sentences = block.split(/(?<=[。！？…])/).filter((s) => s.trim().length >= 10)
    const target = sentences.find((s) => s.length >= 14 && s.length <= 56) ?? sentences[0]
    if (!target) continue
    const quote = `❙ *${target.trim().replace(/^[*"]+|[*"]+$/g, '')}*`
    const idx = Math.max(2, Math.floor(blocks.length * 0.45))
    result = joinBlocks(insertBlock(splitBlocks(result), idx, quote))
    need -= 1
  }
  return result
}

function ensureEndingFooter(blocks: string[], layoutId: LayoutStyleId): string[] {
  const spec = LAYOUT_STYLE_SPECS[layoutId]
  let result = [...blocks]
  const joined = joinBlocks(result)

  if (!/^✦/m.test(joined)) {
    const footer = [
      '✦',
      spec.endingLines.join('\n'),
      spec.authorLine,
      spec.authorBio,
      ...spec.pastLinkTemplates.map((t) => `· ${t}`),
    ].join('\n\n')
    result = [...result, footer]
  } else if (!/文字\s*[|｜]/.test(joined)) {
    result = [
      ...result,
      [spec.authorLine, spec.authorBio, ...spec.pastLinkTemplates.map((t) => `· ${t}`)].join('\n\n'),
    ]
  } else if (!/^·\s/m.test(joined)) {
    result = [...result, ...spec.pastLinkTemplates.map((t) => `· ${t}`)]
  }

  return result
}

/** 补齐极简文艺风必备结构：金句、分割线、｜小标题、❙引用、✦收尾与页脚 */
export function enrichArticleWithLayoutElements(
  body: string,
  layoutId: LayoutStyleId,
): string {
  const trimmed = convertLegacyMarkers(body.trim())
  if (!trimmed || trimmed.length < 200) return trimmed

  let blocks = splitBlocks(trimmed)
  if (blocks.length < 2) return trimmed

  const spec = LAYOUT_STYLE_SPECS[layoutId]
  blocks = ensureOpenQuote(blocks, spec)
  blocks = ensureDividerAfterQuote(blocks, spec)
  blocks = ensureSectionHeadings(blocks, layoutId)

  let text = joinBlocks(blocks)
  text = ensureQuoteBlocks(text, layoutId)
  blocks = ensureEndingFooter(splitBlocks(text), layoutId)

  return joinBlocks(blocks)
}
