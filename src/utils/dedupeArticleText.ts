const ORAL_FILLERS = [
  '哦对了',
  '你知道吗',
  '怎么说呢',
  '说实话',
  '说真的',
  '其实',
  '对了',
  '老实说',
  '坦白讲',
  '不瞒你说',
]

const TEMPLATE_SNIPPETS = [
  '看着这些字，我忍不住笑了',
  '这句话像一根针',
  '一下子就扎到了我',
  '今天就写到这里吧',
  '我们下期再见',
  '不知道你们有没有过这种感觉',
]

function splitChineseSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, '').trim()
  if (!normalized) return []

  const sentences: string[] = []
  let buf = ''
  for (const ch of normalized) {
    buf += ch
    if (/[。！？…]/.test(ch)) {
      sentences.push(buf)
      buf = ''
    } else if (ch === '；' && buf.length >= 16) {
      sentences.push(buf)
      buf = ''
    }
  }
  if (buf.trim()) sentences.push(buf.trim())
  return sentences
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/==([^=]+)==/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .trim()
}

function compareKey(text: string): string {
  return stripInlineMarkdown(text).replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '')
}

function isNearDuplicate(a: string, b: string): boolean {
  if (!a || !b) return false
  if (a === b) return true
  const minLen = 14
  if (a.length < minLen || b.length < minLen) return false
  const short = a.length <= b.length ? a : b
  const long = a.length > b.length ? a : b
  return long.includes(short)
}

function isStructuralLine(line: string): boolean {
  const t = line.trim()
  if (!t) return true
  if (/^#{1,3}\s/.test(t)) return true
  if (t === '---' || t === '✨' || /^✨\s/.test(t)) return true
  if (/^[💡⚠️✅💬]/.test(t)) return true
  if (/^┌|^│|^└/.test(t)) return true
  return false
}

function sentenceSeenBefore(key: string, seen: Set<string>): boolean {
  if (key.length < 10) return false
  if (seen.has(key)) return true
  for (const prev of seen) {
    if (isNearDuplicate(key, prev)) return true
  }
  return false
}

/** 去掉全文重复或高度相似的句子（保留首次出现） */
export function removeDuplicateSentences(body: string): string {
  const seen = new Set<string>()
  const lines = body.split('\n')
  const out: string[] = []

  for (const line of lines) {
    if (isStructuralLine(line)) {
      out.push(line)
      continue
    }

    const trimmed = line.trim()
    if (!trimmed) {
      out.push(line)
      continue
    }

    const sentences = splitChineseSentences(stripInlineMarkdown(trimmed))
    if (sentences.length <= 1) {
      const key = compareKey(trimmed)
      if (sentenceSeenBefore(key, seen)) continue
      if (key.length >= 10) seen.add(key)
      out.push(trimmed)
      continue
    }

    const kept: string[] = []
    let cursor = 0
    const raw = stripInlineMarkdown(trimmed)

    for (const sent of sentences) {
      const key = compareKey(sent)
      if (sentenceSeenBefore(key, seen)) {
        const idx = raw.indexOf(sent, cursor)
        if (idx >= 0) cursor = idx + sent.length
        continue
      }
      if (key.length >= 10) seen.add(key)
      kept.push(sent)
    }

    if (kept.length > 0) {
      out.push(kept.join(''))
    }
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** 口语套话每种最多保留 1 次 */
export function limitOralFillerRepeats(body: string): string {
  let result = body
  for (const phrase of ORAL_FILLERS) {
    let count = 0
    result = result.replace(new RegExp(phrase, 'g'), (match) => {
      count += 1
      return count === 1 ? match : ''
    })
  }
  return result
    .replace(/，{2,}/g, '，')
    .replace(/。{2,}/g, '。')
    .replace(/^[，。]+/gm, '')
    .replace(/[，。]+$/gm, (m) => (m.includes('。') ? '。' : ''))
}

/** 删除完全重复的段落块 */
export function removeDuplicateParagraphs(body: string): string {
  const blocks = body.split(/\n{2,}/)
  const seen = new Set<string>()
  const out: string[] = []

  for (const block of blocks) {
    const key = compareKey(block)
    if (key.length >= 24 && seen.has(key)) continue
    if (key.length >= 24) seen.add(key)
    out.push(block)
  }

  return out.join('\n\n').trim()
}

/** 同一篇里模板示例句只保留一处 */
export function collapseTemplateSnippetRepeats(body: string): string {
  let result = body
  for (const snippet of TEMPLATE_SNIPPETS) {
    let count = 0
    result = result.replace(new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), (match) => {
      count += 1
      return count === 1 ? match : ''
    })
  }
  return result
}

export function dedupeArticleText(body: string): string {
  return removeDuplicateParagraphs(
    removeDuplicateSentences(
      collapseTemplateSnippetRepeats(limitOralFillerRepeats(body)),
    ),
  )
}
