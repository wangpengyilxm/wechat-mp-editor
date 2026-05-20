import type { LayoutStyleId } from '../config/layoutStyles'
import { dedupeArticleText } from './dedupeArticleText'
import { enrichArticleWithLayoutElements } from './enrichArticleStructure'
import { splitGluedOpenQuote } from './literaryQuoteFix'

export const MIN_SECTION_HEADINGS = 2
export const MAX_SECTION_HEADINGS = 3
export const MAX_LITERARY_DIVIDERS = 1

/** 事实与逻辑：最高优先级，压过装饰性排版要求 */
export const FACTUALITY_LOGIC_RULES = `
【事实与逻辑 - 最高优先级】
0. 作者「王哥」是男性：全文第一人称「我」必须是男人；禁止女性自述；结婚/恋爱写男方或单身男性视角，配偶称她/老婆/女朋友。
1. 只写符合现实生活常识的内容：时间顺序、因果、人物动机要自洽，读完不违和。
2. 禁止编造：具体统计数据、调查报告、专家言论、新闻事件、法条、医学诊断、产品功效承诺。
3. 经历写法：用「我」的第一人称感受；时间地点宜模糊（上周、家楼下、公司）勿虚构精确到日的「官方事实」；他人故事用「朋友跟我说」「听说」勿写成你亲历的社会新闻。
4. 观点须标注主观：多用「我觉得」「可能」「也许」，禁止「科学证明」「研究表明」「所有人都」。
5. 紧扣「选定标题」与主题：一条主线写透，不跑题、不硬塞多个互不相关的故事。
6. 禁止输出运营尾巴：关注引导、二维码、点赞三连、[方括号占位符]、伪造读者留言；文末「· 」往期链接按排版专条写 2 条即可。
7. 主题生文必须按五段式纯文本格式输出：金句→·····→故事引入→｜小标题(2～3)→❙引用(1～2)→✦→作者信息→·往期（见排版专条）。
`.trim()

/** 叙事结构：一条主线 + 适度结构元素 */
export const NARRATIVE_STRUCTURE_RULES = `
【叙事结构 - 五段式硬性规定】
1. 顺序固定：金句开篇 → ····· → 故事引入（生活细节白描）→ ｜分点论述 → ❙金句引用 → ✦结尾升华与页脚。
2. 小标题只用「｜标题文字」，全篇 ${MIN_SECTION_HEADINGS}～${MAX_SECTION_HEADINGS} 个；禁止 ## / ### 与编号标题。
3. 语气真诚克制，善用「原来」「后来才明白」；用具体画面代替抽象形容。
4. 分割线只用 ·····，全篇 1 处，紧接金句之后。
5. 引用块 ❙ 开头，1～2 处；可 *斜体*。
6. 每段 ≤4 行；**正文不少于 1500 字**（建议 1500～2400 字）；禁止卡片框、---、✨、==高亮==。
`.trim()

/** 禁止跨段落/模块复读同一句 */
export const ANTI_REPETITION_RULES = `
【反重复 - 硬性规定】
1. 全篇禁止出现两句及以上完全相同或只差一两个字的句子（含小标题下、引用块、段首段尾）。
2. 禁止把同一句「金句」在开头、中间、结尾各说一遍；**金句开篇与正文首段首句必须完全不同**，禁止把故事引入接在金句同一行或同一段后面。
3. 口语词（其实、说实话、对了、哦对了、说真的等）每种最多用 1 次，换不同说法，禁止机械套用提示词示例句。
4. 禁止在不同结构块（正文段、引用、分割线前后）复制粘贴同一段话。
5. 结尾勿重复前文已写过的总结句；收束时换表达或只留一句新的感受。
`.trim()

/** 写入生成提示词的正文排版铁律 */
export const BREATHING_FORMAT_RULES = `
【排版铁律 - 主题生文纯文本】
1. 只输出可排版正文，禁止编辑元信息、色值、Markdown 标题。
2. 五段式顺序不可乱：金句 → ····· → 故事引入 → ｜×2～3 → ❙×1～2 → ✦ → 文字 | 王哥 → ·×2。
3. 段间空一行，每段 ≤4 行，**正文不少于 1500 字**，留白透气。
4. 无段首两字缩进；具体场景细节优先于抽象总结。
5. 禁止 ==高亮==、列表堆砌、卡片框、---、✨、##、工整排比。
`.trim()

const META_LINE = /^(配图占位|已开启配图|极简文艺风\s*→|王哥排版)/

/** 去掉模型误输出的编辑提示行 */
/** 去掉模板残留、假运营模块 */
export function stripTemplateArtifacts(body: string): string {
  const lines = body.split('\n')
  const out: string[] = []
  let skipRest = false

  for (const line of lines) {
    const t = line.trim()
    if (/^##?\s*往期/.test(t) || /^✨\s*往期/.test(t) || /^👇/.test(t)) {
      skipRest = true
      continue
    }
    if (skipRest) continue

    if (/\[文章链接\]|\[公众号二维码\]|\[关注公众号|\[按钮文字\]/.test(t)) continue
    if (/^👇\s*(关注|点击下方)/.test(t)) continue
    if (/^原创不易.*点赞.*在看/.test(t)) continue
    if (/^大家好，我是王哥[。.]?$/.test(t)) continue

    out.push(line)
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function stripEditorMetaLines(body: string): string {
  return body
    .split('\n')
    .filter((line) => {
      const t = line.trim()
      if (!t) return true
      if (META_LINE.test(t)) return false
      if (/^王哥\s*·/.test(t) && t.includes('→')) return false
      if (t === '占位' || t === '配图占位') return false
      return true
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function isStructuralLine(line: string): boolean {
  const t = line.trim()
  if (!t) return true
  if (/^[｜│]/.test(t)) return true
  if (/^[·．]{3,}\s*$/.test(t)) return true
  if (/^❙/.test(t)) return true
  if (/^✦\s*$/.test(t)) return true
  if (/^·\s/.test(t)) return true
  if (/^文字\s*[|｜]/.test(t)) return true
  if (/^#{1,3}\s/.test(t)) return true
  if (t === '---' || t === '✨' || /^✨\s/.test(t)) return true
  if (/^\[.+\]$/.test(t)) return true
  if (t.startsWith('**Q') || t.startsWith('**A')) return true
  return false
}

export function splitChineseSentences(text: string): string[] {
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

  const expanded: string[] = []
  for (const s of sentences) {
    if (s.replace(/\s/g, '').length > 72 && s.includes('，')) {
      const parts = s.split(/(?<=，)/)
      expanded.push(...parts.map((p) => p.trim()).filter(Boolean))
    } else {
      expanded.push(s)
    }
  }
  return expanded
}

function isStandAloneSentence(s: string): boolean {
  const len = s.replace(/\s/g, '').length
  if (len <= 16) return true
  if (len <= 24 && /[！？…~]/.test(s)) return true
  return false
}

function groupSentences(sentences: string[]): string[] {
  const paragraphs: string[] = []
  let i = 0

  while (i < sentences.length) {
    const current = sentences[i]!
    if (isStandAloneSentence(current)) {
      paragraphs.push(current)
      i += 1
      continue
    }

    const group: string[] = [current]
    let chars = current.replace(/\s/g, '').length
    i += 1

    while (i < sentences.length && group.length < 4) {
      const next = sentences[i]!
      if (group.length >= 2 && isStandAloneSentence(next)) break
      if (chars + next.replace(/\s/g, '').length > 110 && group.length >= 2) break
      group.push(next)
      chars += next.replace(/\s/g, '').length
      i += 1
      if (group.length >= 3 && chars >= 80) break
    }

    paragraphs.push(group.join(''))
  }

  return paragraphs
}

function reflowDenseParagraph(paragraph: string): string[] {
  const trimmed = paragraph.trim()
  if (!trimmed) return []

  const sentenceCount = (trimmed.match(/[。！？…]/g) ?? []).length
  const charLen = trimmed.replace(/\s/g, '').length

  if (sentenceCount <= 1 && charLen < 48) return [trimmed]
  if (sentenceCount <= 4 && charLen < 90 && trimmed.includes('\n')) {
    return trimmed
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
  }
  if (sentenceCount <= 3 && charLen < 100) return [trimmed]

  return groupSentences(splitChineseSentences(trimmed))
}

function reflowBlock(block: string): string {
  const lines = block.split('\n')
  const out: string[] = []
  let proseBuf: string[] = []

  const flushProse = () => {
    if (proseBuf.length === 0) return
    const merged = proseBuf.join('').trim()
    proseBuf = []
    if (!merged) return
    for (const p of reflowDenseParagraph(merged)) {
      out.push(p)
    }
  }

  for (const line of lines) {
    if (isStructuralLine(line)) {
      flushProse()
      out.push(line)
    } else if (!line.trim()) {
      flushProse()
    } else {
      proseBuf.push(line.trim())
    }
  }
  flushProse()

  return out.join('\n\n')
}

/** 将大段正文拆成短段，只增删换行，不改字 */
export function reflowBreathingParagraphs(body: string): string {
  const blocks = body.split(/\n{2,}/)
  return blocks.map((b) => reflowBlock(b)).join('\n\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** 将 ## 标题转为 ｜ 形式，并限制 ｜ 小标题数量 */
export function enforceMaxSubheadings(
  body: string,
  max = MAX_SECTION_HEADINGS,
): string {
  let headingCount = 0
  return body
    .split('\n')
    .map((line) => {
      const trimmed = line.trim()
      const md = trimmed.match(/^(#{1,3})\s+(.+)$/)
      if (md) {
        headingCount += 1
        const text = md[2].replace(/^\d+[.、．]\s*/, '')
        if (headingCount <= max) return `｜${text}`
        return text
      }
      if (/^[｜│]/.test(trimmed)) {
        headingCount += 1
        if (headingCount <= max) return trimmed.startsWith('│') ? `｜${trimmed.slice(1).trim()}` : trimmed
        return trimmed.replace(/^[｜│]\s*/, '')
      }
      return line
    })
    .join('\n')
}

function unwrapStandaloneBold(line: string): string {
  const trimmed = line.trim()
  const match = trimmed.match(/^\*\*([^*]+)\*\*$/)
  if (!match) return line
  if (match[1].startsWith('Q') || match[1].startsWith('A')) return line
  return match[1]
}

function flattenNumberedSectionLine(line: string): string {
  const trimmed = line.trim()
  let text = trimmed
  if (/^[一二三四五六七八九十百千]+[、．.]/.test(text)) {
    text = text.replace(/^[一二三四五六七八九十百千]+[、．.]\s*/, '')
  } else if (/^第[一二三四五六七八九十\d]+[部分节章点][、．.]?\s*/.test(text)) {
    text = text.replace(/^第[一二三四五六七八九十\d]+[部分节章点][、．.]?\s*/, '')
  } else if (/^\d+[.、．]\s*/.test(text)) {
    text = text.replace(/^\d+[.、．]\s*/, '')
  } else {
    return line
  }
  return text || line
}

/** 削减旧版式符号，保留极简文艺风结构 */
export function reduceStructuralNoise(body: string): string {
  let dividerCount = 0

  return body
    .split('\n')
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return line

      const md = trimmed.match(/^(#{1,3})\s+(.+)$/)
      if (md) {
        return `｜${md[2].replace(/^\d+[.、．]\s*/, '')}`
      }

      if (trimmed === '---' || trimmed === '✨' || /^✨\s/.test(trimmed)) {
        dividerCount += 1
        if (dividerCount <= MAX_LITERARY_DIVIDERS) return '·····'
        return ''
      }

      if (/^[💡⚠️✅💬]/.test(trimmed) || trimmed.includes('┌')) return ''

      if (/^\*\*[^*]+\*\*$/.test(trimmed)) {
        return unwrapStandaloneBold(line)
      }

      return flattenNumberedSectionLine(line)
    })
    .filter((line, index, arr) => {
      if (line !== '') return true
      return index === 0 || arr[index - 1] !== ''
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
}

/** 预处理：拆开粘在首段的金句，避免渲染时整段变金句 */
export function fixGluedOpeningQuote(body: string): string {
  const blocks = body.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  if (blocks.length === 0) return body
  const first = blocks[0]!
  if (/^[｜│❙✦·]/.test(first) || /^[·．]{3,}/.test(first)) return body
  const { quote, rest } = splitGluedOpenQuote(first)
  if (!rest || rest === first) return body
  const next = [quote, rest, ...blocks.slice(1)].join('\n\n')
  return next
}

export function normalizeArticleBody(body: string, layoutStyleId?: LayoutStyleId): string {
  let result = stripTemplateArtifacts(stripEditorMetaLines(body))
  result = fixGluedOpeningQuote(result)
  result = enforceMaxSubheadings(result)
  result = reduceStructuralNoise(result)
  result = dedupeArticleText(result)
  if (layoutStyleId) {
    result = enrichArticleWithLayoutElements(result, layoutStyleId)
    result = dedupeArticleText(result)
  }
  return reflowBreathingParagraphs(result)
}
