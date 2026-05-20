import { DEFAULT_LAYOUT_STYLE_ID } from '../config/layoutStyles'
import { getLayoutStyleWritingRules, getThemeArticleCharRange } from '../config/layoutStyleWriting'
import type { GenRuntime } from '../utils/genRuntime'

import { assertTextModelReady } from '../utils/genRuntime'

import {

  buildMaleAuthorRewriteUserMessage,

  ensureMaleAuthorPrompt,

  looksLikeFemaleAuthorVoice,

  MALE_AUTHOR_SYSTEM_PROMPT,

  MALE_AUTHOR_USER_REMINDER,

} from '../utils/authorPerspective'

import {

  ANTI_REPETITION_RULES,

  BREATHING_FORMAT_RULES,

  FACTUALITY_LOGIC_RULES,

  NARRATIVE_STRUCTURE_RULES,

  normalizeArticleBody,

} from '../utils/articleBodyFormat'

import { countArticleWords } from '../utils/countWords'

import type { ChatMessage } from './llmClient'

import { chatCompletion } from './llmClient'



const ARTICLE_GEN_TEMPERATURE = 0.68

const ARTICLE_RETRY_TEMPERATURE = 0.55



function buildArticleUserPrompt(
  theme: string,
  articleTitle: string,
  runtime: GenRuntime,
  imageHint: string,
): string {

  const styleGuide = ensureMaleAuthorPrompt(runtime.prompts.articleGen)
  const { min: minChars, max: maxChars } = getThemeArticleCharRange()

  return `${styleGuide}



---

【本次写作任务】



文章主题：${theme.trim() || '（未提供）'}

选定标题：${articleTitle}

排版规范：${DEFAULT_LAYOUT_STYLE_ID}

${getLayoutStyleWritingRules()}

${MALE_AUTHOR_USER_REMINDER}



请根据选定标题，撰写**主题生文**用的公众号正文纯文本。

【硬性输出格式 - 违反即不合格】
你必须且只能按「五段式骨架」输出，符号与顺序与排版专条完全一致：
金句开篇（独立一段）→ ····· → 故事引入（生活细节白描）→ ｜小标题×2～3 + 论述段 → ❙引用×1～2 → ✦ → 收束句 → 文字 | 王哥 → 一行简介 → ·往期×2

其它硬性要求：
- 作者是男性王哥，全文男性第一人称「我」；禁止女性视角
- 内容可信、紧扣标题；不编造数据与新闻
- 正文字数 **不少于 ${minChars} 字**（含标点，不含文章标题；建议 ${minChars}～${maxChars} 字），写足故事与细节，不要过短
- 每段 ≤4 行；语气真诚克制，用具体画面代替抽象话（如「对话框被新消息越推越往下」）
- 全篇严禁重复：金句与故事引入首句不得相同或首尾拼接；禁止范例原句「有些人，光是遇见…」
- 金句须多样化、紧扣本篇主题；一种口语词最多 1 次
- 不要输出关注引导、[方括号占位]、## / --- / ✨ / 卡片框
- 直接输出正文纯文本，不要任何说明或标题行



${FACTUALITY_LOGIC_RULES}



${NARRATIVE_STRUCTURE_RULES}



${ANTI_REPETITION_RULES}



${BREATHING_FORMAT_RULES}${imageHint}`

}



function buildArticleMessages(
  theme: string,
  articleTitle: string,
  runtime: GenRuntime,
  imageHint: string,
  extra?: ChatMessage[],
): ChatMessage[] {
  return [
    { role: 'system', content: MALE_AUTHOR_SYSTEM_PROMPT },
    {
      role: 'user',
      content: buildArticleUserPrompt(theme, articleTitle, runtime, imageHint),
    },

    ...(extra ?? []),

  ]

}



export async function generateArticle(
  theme: string,
  articleTitle: string,
  runtime: GenRuntime,
): Promise<string> {

  if (!runtime.prompts.articleGen.trim()) {

    throw new Error('请先在「提示词」中配置生成文章提示词')

  }



  assertTextModelReady(runtime.textModel)



  const imageHint = runtime.imageEnabled

    ? '\n配图说明：正文需适合穿插配图，段落清晰；生图时将按「文生图」提示词规则处理。'

    : ''



  let content = await chatCompletion(

    runtime.textModel,

    buildArticleMessages(theme, articleTitle, runtime, imageHint),
    { temperature: ARTICLE_GEN_TEMPERATURE },
  )



  if (looksLikeFemaleAuthorVoice(content)) {

    content = await chatCompletion(

      runtime.textModel,

      buildArticleMessages(theme, articleTitle, runtime, imageHint, [
        { role: 'assistant', content: content.slice(0, 1500) },
        {
          role: 'user',
          content: buildMaleAuthorRewriteUserMessage(theme, articleTitle, content),
        },
      ]),

      { temperature: ARTICLE_RETRY_TEMPERATURE },

    )

  }



  if (looksLikeFemaleAuthorVoice(content)) {

    throw new Error(

      '正文仍为女性第一人称，已自动重试仍不合格。请在「提示词·生成文章」开头保留【王哥·男性作者铁律】并换用更强模型后重试。',

    )

  }

  let body = normalizeArticleBody(content.trim(), DEFAULT_LAYOUT_STYLE_ID)
  const { min: minChars } = getThemeArticleCharRange()

  if (countArticleWords(body) < minChars) {
    const expanded = await chatCompletion(
      runtime.textModel,
      [
        ...buildArticleMessages(theme, articleTitle, runtime, imageHint),
        { role: 'assistant', content: body.slice(0, 4000) },
        {
          role: 'user',
          content: `当前正文仅约 ${countArticleWords(body)} 字，未达到 ${minChars} 字要求。请在保持极简文艺风五段式格式与符号不变的前提下，续写并充实故事细节（增加场景、对话、心理活动），合并输出完整正文，总字数不少于 ${minChars} 字。不要重复已有句子。`,
        },
      ],
      { temperature: ARTICLE_RETRY_TEMPERATURE },
    )
    body = normalizeArticleBody(expanded.trim(), DEFAULT_LAYOUT_STYLE_ID)
  }

  return body

}


