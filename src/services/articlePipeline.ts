import { DEFAULT_LAYOUT_STYLE_ID } from '../config/layoutStyles'
import { getArticleWorkflowSteps, getFormatWorkflowSteps } from '../config/workflowSteps'
import type { HistoryItem, WorkflowStepStatus } from '../types'
import { assembleFinalArticle, toDraftPlainText } from '../utils/articleAssembler'
import { normalizeArticleBody } from '../utils/articleBodyFormat'
import { countArticleWords } from '../utils/countWords'
import { buildLayout } from '../utils/layoutEngine'
import type { GenRuntime } from '../utils/genRuntime'
import {
  stepBatchImages,
  stepDraftArticle,
  stepEngagement,
  stepImageCaptions,
  stepSegmentMarks,
  stepStoryboard,
} from './pipelineSteps'

export type ArticlePipelineResult = {
  draftBody: string
  markedBody: string
  finalHtml: string
  plainTextDraft: string
  wordCount: number
  imageUrls: string[]
  imageGenWarnings: string[]
  historyRecord: HistoryItem
}

export type ArticlePipelineInput = {
  theme: string
  articleTitle: string
  runtime: GenRuntime
  skipDraft?: boolean
  existingDraft?: string
  onStep?: (step: string, status: WorkflowStepStatus) => void
  onStepError?: (step: string, err: unknown) => void
  /** 正文初稿（步骤 2）完成后立即回调，用于纯文本预览 */
  onDraftReady?: (draft: { draftBody: string; plainTextDraft: string }) => void
}

async function runStep<T>(
  step: string,
  handlers: Pick<ArticlePipelineInput, 'onStep' | 'onStepError'>,
  fn: () => Promise<T>,
): Promise<T> {
  handlers.onStep?.(step, 'running')
  try {
    const result = await fn()
    handlers.onStep?.(step, 'completed')
    return result
  } catch (err) {
    handlers.onStep?.(step, 'error')
    handlers.onStepError?.(step, err)
    throw err
  }
}

export async function runArticlePipeline(
  input: ArticlePipelineInput,
): Promise<ArticlePipelineResult> {
  const { theme, articleTitle, runtime, onStep, onStepError, onDraftReady, skipDraft, existingDraft } =
    input
  const stepHandlers = { onStep, onStepError }
  const seed = `${theme}\n${articleTitle}`
  void (skipDraft ? getFormatWorkflowSteps() : getArticleWorkflowSteps(runtime.imageEnabled))

  let draftBody = existingDraft?.trim() ?? ''
  if (!skipDraft) {
    draftBody = await runStep('正文初稿', stepHandlers, () =>
      stepDraftArticle(theme, articleTitle, runtime),
    )
  } else if (!draftBody) {
    throw new Error('请先输入正文再进行排版')
  }

  draftBody = normalizeArticleBody(draftBody, DEFAULT_LAYOUT_STYLE_ID)

  onDraftReady?.({
    draftBody,
    plainTextDraft: toDraftPlainText(articleTitle, draftBody),
  })

  let { markedBody, moodTags } = await runStep('段内标记', stepHandlers, () =>
    stepSegmentMarks(draftBody, runtime),
  )

  const storyboard = await runStep('分镜设计', stepHandlers, () =>
    stepStoryboard(markedBody, runtime),
  )

  const layout = buildLayout(seed, moodTags)
  markedBody = normalizeArticleBody(markedBody, layout.resolvedId)

  let imageUrls: string[] = []
  let imageGenWarnings: string[] = []
  if (runtime.imageEnabled) {
    const batch = await runStep('图文排版', stepHandlers, () =>
      stepBatchImages(storyboard.imagePrompts, runtime),
    )
    imageUrls = batch.urls
    imageGenWarnings = batch.errors
  } else {
    onStep?.('图文排版', 'running')
    imageUrls = ['', '', '']
    onStep?.('图文排版', 'completed')
  }

  const imageCaptions = await runStep('配图情感语录', stepHandlers, () =>
    stepImageCaptions(
      {
        imagePrompts: storyboard.imagePrompts,
        theme,
        articleTitle,
        markedBody,
        moodTags,
      },
      runtime,
    ),
  )

  const engagementText = await runStep('互动引导', stepHandlers, () =>
    stepEngagement(theme, articleTitle, runtime),
  )

  const finalHtml = assembleFinalArticle({
    title: articleTitle,
    body: markedBody,
    theme,
    layout,
    imageEnabled: runtime.imageEnabled,
    imageUrls,
    imageCaptions,
    engagementText,
    styleMetaLabel: layout.theme.label,
  })

  const wordCount = countArticleWords(draftBody)
  const plainTextDraft = toDraftPlainText(articleTitle, draftBody)

  const historyRecord: HistoryItem = {
    id: String(Date.now()),
    title: articleTitle,
    mode: 'theme',
    updatedAt: new Date().toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    theme,
    draftBody,
    markedBody,
    finalHtml,
    plainTextDraft,
    wordCount,
    imageUrls,
    layoutStyle: DEFAULT_LAYOUT_STYLE_ID,
    resolvedLayoutStyle: DEFAULT_LAYOUT_STYLE_ID,
    createdAt: new Date().toISOString(),
  }

  onStep?.('自动保存', 'running')
  onStep?.('自动保存', 'completed')

  return {
    draftBody,
    markedBody,
    finalHtml,
    plainTextDraft,
    wordCount,
    imageUrls,
    imageGenWarnings,
    historyRecord,
  }
}
