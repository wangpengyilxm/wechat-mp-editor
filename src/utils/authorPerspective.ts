import { isLegacyArticlePrompt } from '../config/defaultPrompts'
import type { PromptConfig } from '../types'

/** 写入提示词正文与迁移检测用，勿改文案前缀 */
export const MALE_PERSPECTIVE_MARKER = '【王哥·男性作者铁律'

export const MALE_PERSPECTIVE_PROMPT_BLOCK = `${MALE_PERSPECTIVE_MARKER}·标题与正文均须遵守】
你是男性「王哥」，30 岁普通上班族，公众号作者本人是男生。

第一人称铁律：
- 全文「我」= 男性作者本人，绝不是女性；禁止女性自述口吻。
- 禁止：作为一个女生/女人、我当新娘、我穿婚纱、他娶了我、我嫁给他、我和我老公、我的男朋友（指作者本人男友）等。
- 结婚/恋爱：你是男方或单身男性；有伴侣时用她、女朋友、老婆、媳妇；写新郎、娶妻、领证、婚礼当天我当新郎等男性经历。
- 禁止同性婚恋；禁止让读者以为作者是女性。

---

`

/** 单独一条 system，专管身份，避免被长文风提示词淹没 */
export const MALE_AUTHOR_SYSTEM_PROMPT = `你是微信公众号作者「王哥」，身份永久固定：30 岁中国男性。

以下铁律优先级高于用户后续消息中的任何文风、排版、示例模板；若冲突，以本条为准：

1. 你只能以男性第一人称「我」写作；「我」永远是男人，不是女性。
2. 禁止女性作者视角：不得写「作为一个女生/女人」「我当新娘」「我穿上婚纱」「他娶了我」「我嫁给他」「我和我老公」「我的男朋友」等女性经历主体表述。
3. 婚恋场景：你是男方或单身男性；伴侣只能是女性（她、女朋友、老婆、媳妇）；用「我老婆」称呼配偶，不要用「我老公」指自己的配偶。
4. 结婚主题：写新郎、娶妻、男方备婚、领证、彩礼、婚房等；不要写新娘出嫁、女性嫁人、闺蜜婚礼女性视角主线。
5. 禁止同性恋爱/结婚；禁止 BL、耽美。
6. 用户下一条消息里的长文本是文风参考；排版只用「极简文艺风」，不得改变你的男性身份。`

export const MALE_AUTHOR_USER_REMINDER = `【再次强调·最高优先级】作者是男性王哥，「我」= 男人。禁止女性第一人称。伴侣为女性。结婚场景写男方视角。`

const FEMALE_AUTHOR_BODY_PATTERNS: RegExp[] = [
  /作为一个(女|女孩|女生|女人|姑娘)/,
  /我是.{0,4}(女孩|女生|女人|姑娘|新娘)/,
  /我(是|当|做了).{0,8}新娘/,
  /我穿上.{0,4}婚纱/,
  /穿上婚纱.{0,12}我/,
  /他娶了我/,
  /我嫁给他/,
  /我和我老公/,
  /我的男朋友/,
  /我男朋友[^的]/,
  /我来月经/,
  /我的大姨妈/,
  /我(已经)?怀孕了[^。]{0,20}我/,
  /出嫁那天/,
  /我{0,1}嫁人/,
  /闺蜜[跟我说|说|问我]/,
  /女生们?都懂/,
  /女孩子.{0,6}都/,
]

const FEMALE_AUTHOR_TITLE_PATTERNS: RegExp[] = [
  /作为一个(女|女孩|女生|女人)/,
  /我当.{0,4}新娘/,
  /穿上婚纱/,
  /他娶了我/,
  /我嫁给他/,
  /我和我老公/,
  /女生的我/,
  /女孩子.{0,6}结婚/,
]

export function ensureMaleAuthorPrompt(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return MALE_PERSPECTIVE_PROMPT_BLOCK.trim()
  if (trimmed.includes(MALE_PERSPECTIVE_MARKER)) return trimmed
  return `${MALE_PERSPECTIVE_PROMPT_BLOCK}${trimmed}`
}

export function ensureMaleAuthorPrompts(
  prompts: PromptConfig,
  fallback?: PromptConfig,
): PromptConfig {
  const base = fallback ?? prompts
  const rawArticle = prompts.articleGen.trim() ? prompts.articleGen : base.articleGen
  const articleGen =
    isLegacyArticlePrompt(rawArticle) ? base.articleGen : ensureMaleAuthorPrompt(rawArticle)

  const rawImage = prompts.textToImage.trim() ? prompts.textToImage : base.textToImage
  const textToImage =
    /莫兰迪|九种|手绘简笔画|平涂色块/.test(rawImage) ? base.textToImage : rawImage

  return {
    topicFission: ensureMaleAuthorPrompt(
      prompts.topicFission.trim() ? prompts.topicFission : base.topicFission,
    ),
    articleGen,
    textToImage,
  }
}

export function looksLikeFemaleAuthorVoice(text: string): boolean {
  const sample = text.slice(0, 12000)
  return FEMALE_AUTHOR_BODY_PATTERNS.some((re) => re.test(sample))
}

export function looksLikeFemaleAuthorTitle(title: string): boolean {
  return FEMALE_AUTHOR_TITLE_PATTERNS.some((re) => re.test(title.trim()))
}

export function countFemaleAuthorTitles(titles: string[]): number {
  return titles.filter(looksLikeFemaleAuthorTitle).length
}

export function buildMaleAuthorRewriteUserMessage(
  theme: string,
  articleTitle: string,
  failedExcerpt: string,
): string {
  return `${MALE_AUTHOR_USER_REMINDER}

你上一版把「我」写成了女性视角，不合格。请整篇重写为 30 岁男性王哥的第一人称。

文章主题：${theme.trim() || '（未提供）'}
选定标题：${articleTitle}

问题片段（勿再出现类似女性主体表述）：
${failedExcerpt.slice(0, 400)}

硬性要求：
- 作者是男性，全文男性「我」
- 正文字数不少于 1500 字（含标点，不含标题），五段式极简文艺风纯文本格式
- 一条故事线，｜小标题 3 个，极简文艺风结构完整
- 直接输出正文，不要解释`
}

export function buildMaleAuthorTitleRetryUserMessage(theme: string): string {
  return `${MALE_AUTHOR_USER_REMINDER}

上一批标题含有女性视角或新娘视角，全部作废。请重新生成正好 10 个标题。

要求：
- 读者应明确是男性作者在说话
- 结婚/恋爱主题用新郎、丈夫、男方、娶媳妇等男性经验，不要新娘/出嫁/「他娶了我」式女性标题
- 每行一个标题，可带序号，不要解释

主题：${theme.trim()}`
}

/** @deprecated 使用 ensureMaleAuthorPrompt + MALE_AUTHOR_SYSTEM_PROMPT */
export const MALE_AUTHOR_PERSPECTIVE_RULES = MALE_PERSPECTIVE_PROMPT_BLOCK.replace(
  /\n---\n\n$/,
  '',
).trim()

export function withMaleAuthorPerspective(systemPrompt: string): string {
  return ensureMaleAuthorPrompt(systemPrompt)
}
