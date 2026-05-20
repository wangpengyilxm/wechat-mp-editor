/** 图下说明不应出现的生图/画风类词汇 */
const PROMPT_LIKE_PATTERN =
  /莫兰迪|手绘风|手绘|特写|画风|构图|色调|低饱和|文生图|插画|平涂|倒影|侧影|穹顶|玻璃窗|场景\s*\d|配图占位/

const DEFAULT_EMOTIONAL_CAPTION = '有些瞬间，不用说出来，心里也明白了。'

const DEFAULT_EMOTIONAL_CAPTIONS = [
  DEFAULT_EMOTIONAL_CAPTION,
  '日子平常，可一想到那儿，心里就软了一下。',
  '后来才知道，当时以为平常的一天，其实挺重要的。',
]

/** 只保留第一句（图下情感语录全篇一句） */
export function toSingleSentence(text: string): string {
  const trimmed = text.trim().replace(/^["'「『]|["'」』]$/g, '')
  if (!trimmed) return ''
  const first = trimmed.match(/^[^。！？…]+[。！？…]?/)?.[0]?.trim()
  return first && first.length >= 4 ? first : trimmed.slice(0, 28)
}

export function looksLikeImagePromptCaption(text: string): boolean {
  const t = text.trim()
  if (!t) return true
  if (t.length > 36) return true
  return PROMPT_LIKE_PATTERN.test(t)
}

export function sanitizeImageCaption(text: string, index = 0): string {
  const one = toSingleSentence(text)
  const trimmed = one.trim()
  if (!trimmed || looksLikeImagePromptCaption(trimmed)) {
    return DEFAULT_EMOTIONAL_CAPTIONS[index] ?? DEFAULT_EMOTIONAL_CAPTION
  }
  return trimmed
}

/** 全篇只保留一句配图情感语录，供 3 个配图位共用（仅首图下展示） */
export function normalizeImageCaptions(captions: string[], _count = 3): string[] {
  const raw = captions.map((c) => sanitizeImageCaption(c, 0)).find((c) => c.trim()) ?? ''
  const single = toSingleSentence(raw) || DEFAULT_EMOTIONAL_CAPTION
  const line = looksLikeImagePromptCaption(single)
    ? DEFAULT_EMOTIONAL_CAPTION
    : single
  return [line, '', '']
}

export function getPrimaryImageCaption(captions: string[]): string {
  const [first] = normalizeImageCaptions(captions)
  return first ?? ''
}
