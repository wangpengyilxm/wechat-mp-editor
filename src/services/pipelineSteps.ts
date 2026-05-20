import {
  ENGAGEMENT_SYSTEM,
  IMAGE_CAPTION_SYSTEM,
  SEGMENT_MARK_SYSTEM,
  STORYBOARD_SYSTEM,
} from '../config/pipelinePrompts'
import { MALE_AUTHOR_SYSTEM_PROMPT, MALE_AUTHOR_USER_REMINDER } from '../utils/authorPerspective'
import type { GenRuntime } from '../utils/genRuntime'
import { assertImageModelReady, assertTextModelReady } from '../utils/genRuntime'
import { normalizeImageCaptions, looksLikeImagePromptCaption } from '../utils/imageCaptions'
import { parseImageCaptionsJson, parseSegmentMarksJson, parseStoryboardJson } from '../utils/parseJson'
import {
  applySegmentMarks,
  pickMarkStylesForEngine,
  type SegmentMark,
} from '../utils/segmentMarking'
import { chatCompletion } from './llmClient'
import { generateArticle } from './articleGen'
import { generateImageUrl } from './imageGen'

export type StoryboardScene = { action: string; emotion: string }
export type StoryboardScript = { name: string; scenes: StoryboardScene[] }

export type StoryboardResult = {
  scripts: StoryboardScript[]
  imagePrompts: string[]
}

export type ImageCaptionInput = {
  imagePrompts: string[]
  theme: string
  articleTitle: string
  markedBody: string
  moodTags: string[]
}

export async function stepDraftArticle(
  theme: string,
  articleTitle: string,
  runtime: GenRuntime,
): Promise<string> {
  return generateArticle(theme, articleTitle, runtime)
}

export async function stepSegmentMarks(
  draftBody: string,
  runtime: GenRuntime,
): Promise<{ markedBody: string; moodTags: string[] }> {
  assertTextModelReady(runtime.textModel)
  const allowed = pickMarkStylesForEngine().join('、')

  const runMarkRequest = () =>
    chatCompletion(
      runtime.textModel,
      [
        { role: 'system', content: SEGMENT_MARK_SYSTEM },
        {
          role: 'user',
          content: `排版规范：极简文艺风\n允许样式：${allowed}\n\n正文：\n${draftBody.slice(0, 8000)}`,
        },
      ],
      { temperature: 0.3 },
    )

  let raw = await runMarkRequest()
  let parsed = parseSegmentMarksJson(raw)

  if (parsed.marks.length === 0) {
    raw = await runMarkRequest()
    parsed = parseSegmentMarksJson(raw)
  }

  const validStyles = new Set(['highlight', 'bold', 'strike', 'italic'])
  const marks = (parsed.marks ?? [])
    .filter(
      (m) =>
        Number.isFinite(m.paragraph) &&
        m.paragraph >= 0 &&
        m.keyword?.trim() &&
        validStyles.has(m.style),
    )
    .map((m) => ({
      paragraph: m.paragraph,
      keyword: m.keyword.trim(),
      style: m.style as SegmentMark['style'],
    }))

  const markedBody = marks.length > 0 ? applySegmentMarks(draftBody, marks) : draftBody
  return { markedBody, moodTags: parsed.moodTags ?? [] }
}

export async function stepStoryboard(
  markedBody: string,
  runtime: GenRuntime,
): Promise<StoryboardResult> {
  assertTextModelReady(runtime.textModel)

  const raw = await chatCompletion(runtime.textModel, [
    { role: 'system', content: MALE_AUTHOR_SYSTEM_PROMPT },
    { role: 'system', content: STORYBOARD_SYSTEM },
    {
      role: 'user',
      content: `${MALE_AUTHOR_USER_REMINDER}\n文章作者是男性王哥，分镜与配图描述勿写成女性第一人称。\n\n文章正文：\n${markedBody.slice(0, 10000)}`,
    },
  ])

  const parsed = parseStoryboardJson(raw)
  const scripts = parsed.scripts ?? []
  let imagePrompts = parsed.imagePrompts ?? []
  if (imagePrompts.length < 3) {
    const base = runtime.prompts.textToImage.slice(0, 80)
    while (imagePrompts.length < 3) {
      imagePrompts.push(`${base}，场景 ${imagePrompts.length + 1}`)
    }
  }
  imagePrompts = imagePrompts.slice(0, 3)
  return { scripts, imagePrompts }
}

async function requestImageCaptions(
  input: ImageCaptionInput,
  runtime: GenRuntime,
  strictRetry: boolean,
): Promise<string> {
  const sceneLines = input.imagePrompts
    .map((p, i) => `${i + 1}. ${p}`)
    .join('\n')
  const moods = input.moodTags.length ? input.moodTags.join('、') : '（未标注）'

  const userContent = strictRetry
    ? `上次输出不合格：含有画风/构图词或照抄了画面描述。请重新生成 **1 句** 纯情感语录 JSON。

文章标题：${input.articleTitle}
主题：${input.theme}
情绪标签：${moods}

【仅供理解画面，勿写入语录】
${sceneLines}

正文摘要：
${input.markedBody.slice(0, 2000)}`
    : `文章标题：${input.articleTitle}
主题：${input.theme}
情绪标签：${moods}

配图画面参考（读者看不到，勿照抄到语录里）：
${sceneLines}

正文摘要：
${input.markedBody.slice(0, 2000)}

请输出 {"captions":["一句12-28字的情感语录"]}，全篇配图只此一句。`

  return chatCompletion(
    runtime.textModel,
    [
      { role: 'system', content: MALE_AUTHOR_SYSTEM_PROMPT },
      { role: 'system', content: IMAGE_CAPTION_SYSTEM },
      {
        role: 'user',
        content: `${MALE_AUTHOR_USER_REMINDER}\n${userContent}`,
      },
    ],
    { temperature: strictRetry ? 0.45 : 0.65 },
  )
}

export async function stepImageCaptions(
  input: ImageCaptionInput,
  runtime: GenRuntime,
): Promise<string[]> {
  assertTextModelReady(runtime.textModel)

  let raw = await requestImageCaptions(input, runtime, false)
  let { captions } = parseImageCaptionsJson(raw)
  let normalized = normalizeImageCaptions(captions, 3)

  const primary = normalized[0] ?? ''
  if (looksLikeImagePromptCaption(primary) || !primary.trim()) {
    raw = await requestImageCaptions(input, runtime, true)
    captions = parseImageCaptionsJson(raw).captions
    normalized = normalizeImageCaptions(captions, 3)
  }

  return normalized
}

export type BatchImageResult = {
  urls: string[]
  errors: string[]
}

export async function stepBatchImages(
  prompts: string[],
  runtime: GenRuntime,
): Promise<BatchImageResult> {
  assertImageModelReady(runtime.imageModel)

  const urls: string[] = []
  const errors: string[] = []

  for (let i = 0; i < prompts.length; i += 1) {
    const prompt = prompts[i]!
    const full = `${runtime.prompts.textToImage.slice(0, 200)}\n${prompt}`
    try {
      const url = await generateImageUrl(runtime.imageModel, full)
      urls.push(url)
    } catch (err) {
      const message = err instanceof Error ? err.message : '生图失败'
      errors.push(`配图 ${i + 1}：${message}`)
      urls.push('')
    }
  }

  const successCount = urls.filter(Boolean).length
  if (successCount === 0) {
    throw new Error(
      errors.join('；') || '三张配图均未生成成功，请检查生图模型配置与 API Key',
    )
  }

  return { urls, errors }
}

export async function stepEngagement(
  theme: string,
  articleTitle: string,
  runtime: GenRuntime,
): Promise<string> {
  assertTextModelReady(runtime.textModel)
  const text = await chatCompletion(runtime.textModel, [
    { role: 'system', content: MALE_AUTHOR_SYSTEM_PROMPT },
    { role: 'system', content: ENGAGEMENT_SYSTEM },
    {
      role: 'user',
      content: `${MALE_AUTHOR_USER_REMINDER}\n文章主题：${theme}\n文章标题：${articleTitle}\n\n请写男性作者王哥的文末互动引导。`,
    },
  ])
  return text.trim()
}
