import type { MatchedLayout } from './layoutEngine'
import { getPrimaryImageCaption } from './imageCaptions'
import { splitParagraphs, type ContentBlock } from './articleImages'
import { computeImageInsertAfterIndices } from './imagePlacement'
import { renderWangGeArticleHtml } from './wangGeFormat'

export type AssembleArticleInput = {
  title: string
  body: string
  theme: string
  layout: MatchedLayout
  imageEnabled: boolean
  imageUrls?: string[]
  imageCaptions?: string[]
  engagementText: string
  styleMetaLabel: string
}

function hashPick(seed: string, min: number, max: number): number {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) h = (h << 5) - h + seed.charCodeAt(i)
  return min + (Math.abs(h) % (max - min + 1))
}

export function buildBlocksWithImages(
  body: string,
  imageEnabled: boolean,
  imageUrls: string[],
  captions: string[],
): ContentBlock[] {
  const paragraphs = splitParagraphs(body)
  if (paragraphs.length === 0) return []

  const insertAfter = computeImageInsertAfterIndices(paragraphs.length, 3)
  const blocks: ContentBlock[] = []
  let imageIndex = 0
  const sharedCaption = getPrimaryImageCaption(captions)

  paragraphs.forEach((text, i) => {
    blocks.push({ type: 'paragraph', text, index: i })

    if (insertAfter.includes(i) && imageIndex < 3) {
      const url = imageUrls[imageIndex]
      blocks.push({
        type: 'image',
        caption: imageIndex === 0 ? sharedCaption : '',
        index: imageIndex,
        isPlaceholder: !imageEnabled || !url,
        url: url || undefined,
        borderRadius: hashPick(`${i}:${imageIndex}`, 4, 6),
        widthPercent: 100,
        shadow: false,
      })
      imageIndex += 1
    }
  })

  return blocks
}

export function renderEngagementBlock(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>')

  return `
    <section style="margin-top:24px;padding-top:16px;border-top:1px solid #8B7E7422;">
      <p style="font-size:13px;color:#8B7E74;line-height:1.75;letter-spacing:1px;margin:0;text-align:center;font-style:italic;">${escaped}</p>
    </section>
  `.trim()
}

export function assembleFinalArticle(input: AssembleArticleInput): string {
  const {
    title,
    body,
    layout,
    imageEnabled,
    imageUrls = [],
    imageCaptions = [],
    engagementText,
    styleMetaLabel,
  } = input

  const blocks = buildBlocksWithImages(body, imageEnabled, imageUrls, imageCaptions)
  const engagementHtml = renderEngagementBlock(engagementText)

  return renderWangGeArticleHtml(title, body, layout.theme, imageEnabled, styleMetaLabel, {
    blocks,
    layoutParams: layout.params,
    engagementHtml,
  })
}

export function toDraftPlainText(title: string, draftBody: string): string {
  const lines: string[] = []
  if (title.trim()) lines.push(title.trim(), '')
  lines.push(draftBody.trim())
  return lines.join('\n').trim()
}
