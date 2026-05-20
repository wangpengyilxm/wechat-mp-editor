export type ContentBlock =
  | { type: 'paragraph'; text: string; index: number }
  | {
      type: 'image'
      caption: string
      index: number
      isPlaceholder: boolean
      url?: string
      borderRadius?: number
      widthPercent?: number
      shadow?: boolean
    }

const IMAGE_CAPTIONS = [
  '封面配图',
  '场景示意图',
  '细节展示',
  '总结配图',
]

export function splitParagraphs(body: string): string[] {
  const chunks = body.includes('\n\n')
    ? body.split(/\n{2,}/)
    : body.split(/\n/)
  return chunks.map((p) => p.trim()).filter(Boolean)
}

function shouldInsertImageSlot(
  paragraphIndex: number,
  paragraphCount: number,
  imageCount: number,
): boolean {
  if (imageCount >= 3 || paragraphCount < 4) return false
  const insertAfter = [1, Math.floor(paragraphCount / 2), paragraphCount - 2].filter(
    (i) => i >= 1 && i <= paragraphCount - 2,
  )
  return insertAfter.includes(paragraphIndex)
}

/**
 * 配图开启：穿插配图位（待批量生图填充）
 * 配图关闭：同样位置穿插占位符，跳过提示词与生图流程
 */
export function buildContentBlocks(body: string, imageEnabled: boolean): ContentBlock[] {
  const paragraphs = splitParagraphs(body)
  if (paragraphs.length === 0) return []

  const blocks: ContentBlock[] = []
  let imageCount = 0

  paragraphs.forEach((text, i) => {
    blocks.push({ type: 'paragraph', text, index: i })

    if (shouldInsertImageSlot(i, paragraphs.length, imageCount)) {
      blocks.push({
        type: 'image',
        caption: IMAGE_CAPTIONS[imageCount] ?? `配图 ${imageCount + 1}`,
        index: imageCount,
        isPlaceholder: !imageEnabled,
      })
      imageCount += 1
    }
  })

  return blocks
}

export function toPlainTextWithImages(title: string, body: string, imageEnabled: boolean): string {
  const blocks = buildContentBlocks(body, imageEnabled)
  if (blocks.length === 0) return ''

  const lines: string[] = []
  if (title.trim()) lines.push(title.trim(), '')

  for (const block of blocks) {
    if (block.type === 'paragraph') {
      lines.push(block.text, '')
    } else {
      const tag = block.isPlaceholder ? '配图占位' : '配图'
      lines.push(`[${tag} ${block.index + 1}：${block.caption}]`, '')
    }
  }

  return lines.join('\n').trim()
}
