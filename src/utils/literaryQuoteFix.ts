/** 金句开篇最大字数（含标点） */
export const MAX_GOLDEN_QUOTE_LEN = 42

const STORY_INTRO_START =
  /(?=(上周|前几天|那天|后来|就像|有一次|记得|翻开|清理|点进|打开|坐在|走在|回到))/

const CANONICAL_OPEN_QUOTES = [
  '有些人，光是遇见，就已经是上上签了。',
  '后来才明白，告别也可以没有声音。',
]

/** 从粘连段落中拆出金句与故事引入 */
export function splitGluedOpenQuote(text: string): { quote: string; rest: string } {
  const trimmed = text.trim()
  if (!trimmed) return { quote: '', rest: '' }

  if (trimmed.length <= MAX_GOLDEN_QUOTE_LEN) {
    const oneSentence = trimmed.match(/^[^。！？…]+[。！？…]/)?.[0]
    if (oneSentence && oneSentence.length <= MAX_GOLDEN_QUOTE_LEN) {
      const rest = trimmed.slice(oneSentence.length).trim()
      return { quote: oneSentence, rest }
    }
    return { quote: trimmed, rest: '' }
  }

  const punctSplit = trimmed.match(/^(.+?[。！？…])([\s\S]*)$/)
  if (punctSplit && punctSplit[1].length >= 8 && punctSplit[1].length <= MAX_GOLDEN_QUOTE_LEN) {
    return { quote: punctSplit[1], rest: punctSplit[2].trim() }
  }

  const storyMatch = trimmed.match(new RegExp(`^([\\s\\S]{8,${MAX_GOLDEN_QUOTE_LEN}}?)${STORY_INTRO_START.source}`))
  if (storyMatch?.[1]) {
    return { quote: storyMatch[1].trim(), rest: trimmed.slice(storyMatch[1].length).trim() }
  }

  const commaIdx = trimmed.lastIndexOf('，', MAX_GOLDEN_QUOTE_LEN)
  if (commaIdx >= 10) {
    return {
      quote: trimmed.slice(0, commaIdx + 1),
      rest: trimmed.slice(commaIdx + 1).trim(),
    }
  }

  return {
    quote: trimmed.slice(0, MAX_GOLDEN_QUOTE_LEN),
    rest: trimmed.slice(MAX_GOLDEN_QUOTE_LEN).trim(),
  }
}

function normalizeCompare(s: string): string {
  return s.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '')
}

function sharesLongPrefix(a: string, b: string, minLen = 12): boolean {
  const na = normalizeCompare(a)
  const nb = normalizeCompare(b)
  if (!na || !nb) return false
  if (na === nb) return true
  const short = na.length <= nb.length ? na : nb
  const long = na.length > nb.length ? na : nb
  return short.length >= minLen && long.startsWith(short)
}

/** 去掉正文段与金句/前段的重复起句 */
export function removeLeadingOverlap(earlier: string, later: string): string {
  const e = earlier.trim()
  let l = later.trim()
  if (!e || !l) return l

  if (sharesLongPrefix(e, l, 10)) {
    const storyStart = l.match(/(上周|前几天|那天|后来|就像|有一次|记得|翻开|清理|点进|打开)/)
    if (storyStart?.index != null && storyStart.index > 0) {
      return l.slice(storyStart.index).trim()
    }
    if (normalizeCompare(l).startsWith(normalizeCompare(e)) && normalizeCompare(e).length >= 10) {
      const cutLen = Math.min(l.length, e.length + 4)
      return l.slice(cutLen).trim() || l
    }
  }

  const tail = e.slice(-Math.min(20, e.length))
  const nt = normalizeCompare(tail)
  if (nt.length >= 8 && normalizeCompare(l).startsWith(nt)) {
    const storyStart = l.match(/(上周|前几天|那天|后来|就像)/)
    if (storyStart?.index != null && storyStart.index > 0) {
      return l.slice(storyStart.index).trim()
    }
  }

  return l
}

export function isValidGoldenQuoteLine(line: string): boolean {
  const t = line.trim()
  if (!t || t.length > MAX_GOLDEN_QUOTE_LEN) return false
  if (/^(上周|前几天|那天|后来才|就像某个)/.test(t)) return false
  const punctCount = (t.match(/[。！？…]/g) ?? []).length
  if (punctCount > 1) return false
  if (punctCount === 0 && t.length > 36) return false
  return true
}

export function isCanonicalOverusedQuote(text: string): boolean {
  const key = normalizeCompare(text)
  return CANONICAL_OPEN_QUOTES.some((q) => key === normalizeCompare(q))
}
