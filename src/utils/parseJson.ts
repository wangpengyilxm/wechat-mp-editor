function extractJsonObject(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = (fenced?.[1] ?? text).trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start >= 0 && end > start) return raw.slice(start, end + 1)
  return raw
}

function repairJson(json: string): string {
  let s = json
  s = s.replace(/\uFEFF/g, '')
  s = s.replace(/[\u201c\u201d]/g, '"')
  s = s.replace(/[\u2018\u2019]/g, "'")
  s = s.replace(/,\s*([}\]])/g, '$1')
  s = s.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":')
  return s.trim()
}

function tryParse<T>(json: string): T | null {
  try {
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

/** 从损坏的 JSON 文本中尽力提取 marks 数组项 */
export function extractSegmentMarksLoose(text: string): {
  marks: { paragraph: number; keyword: string; style: string }[]
  moodTags: string[]
} {
  const marks: { paragraph: number; keyword: string; style: string }[] = []
  const markRe =
    /"paragraph"\s*:\s*(\d+)\s*,\s*"keyword"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"style"\s*:\s*"(highlight|bold|strike|italic)"/gi

  let m: RegExpExecArray | null
  while ((m = markRe.exec(text)) !== null) {
    marks.push({
      paragraph: Number(m[1]),
      keyword: m[2].replace(/\\"/g, '"'),
      style: m[3].toLowerCase(),
    })
  }

  const moodTags: string[] = []
  const moodMatch = text.match(/"moodTags"\s*:\s*\[([\s\S]*?)\]/i)
  if (moodMatch?.[1]) {
    const tagRe = /"((?:\\.|[^"\\])*)"/g
    let tm: RegExpExecArray | null
    while ((tm = tagRe.exec(moodMatch[1])) !== null) {
      moodTags.push(tm[1].replace(/\\"/g, '"'))
    }
  }

  return { marks, moodTags }
}

export function parseJsonBlock<T>(text: string): T {
  const slice = extractJsonObject(text)
  const repaired = repairJson(slice)

  const direct = tryParse<T>(repaired)
  if (direct) return direct

  const original = tryParse<T>(slice)
  if (original) return original

  throw new Error(
    `JSON 解析失败：${repaired.slice(0, 120)}${repaired.length > 120 ? '…' : ''}`,
  )
}

/** 解析段内标记结果；失败时尝试宽松提取，仍失败则返回空标记 */
export function parseSegmentMarksJson(text: string): {
  marks: { paragraph: number; keyword: string; style: string }[]
  moodTags: string[]
} {
  try {
    const parsed = parseJsonBlock<{
      marks?: { paragraph: number; keyword: string; style: string }[]
      moodTags?: string[]
    }>(text)
    return {
      marks: parsed.marks ?? [],
      moodTags: parsed.moodTags ?? [],
    }
  } catch {
    const loose = extractSegmentMarksLoose(text)
    if (loose.marks.length > 0) return loose
    return { marks: [], moodTags: loose.moodTags }
  }
}

export function parseImageCaptionsJson(text: string): { captions: string[] } {
  try {
    const parsed = parseJsonBlock<{ captions?: string[] }>(text)
    return { captions: (parsed.captions ?? []).map((s) => String(s).trim()).filter(Boolean) }
  } catch {
    const captions: string[] = []
    const block = text.match(/"captions"\s*:\s*\[([\s\S]*?)\]/i)
    if (block?.[1]) {
      const lineRe = /"((?:\\.|[^"\\])*)"/g
      let m: RegExpExecArray | null
      while ((m = lineRe.exec(block[1])) !== null && captions.length < 3) {
        const line = m[1].replace(/\\"/g, '"').trim()
        if (line.length >= 4) captions.push(line)
      }
    }
    return { captions }
  }
}

export function parseStoryboardJson(text: string): {
  scripts: { name: string; scenes: { action: string; emotion: string }[] }[]
  imagePrompts: string[]
} {
  try {
    return parseJsonBlock(text)
  } catch {
    const imagePrompts: string[] = []
    const promptRe = /"((?:\\.|[^"\\])*)"/g
    const block = text.match(/"imagePrompts"\s*:\s*\[([\s\S]*?)\]/i)
    if (block?.[1]) {
      let m: RegExpExecArray | null
      while ((m = promptRe.exec(block[1])) !== null && imagePrompts.length < 3) {
        const p = m[1].replace(/\\"/g, '"').trim()
        if (p.length > 4) imagePrompts.push(p)
      }
    }
    return { scripts: [], imagePrompts }
  }
}
