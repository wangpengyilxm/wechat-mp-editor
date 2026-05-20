export const TOPIC_FISSION_STEP = '选题裂变'

export const WORKFLOW_STEPS_ALL = [
  TOPIC_FISSION_STEP,
  '正文初稿',
  '段内标记',
  '分镜设计',
  '图文排版',
  '配图情感语录',
  '互动引导',
  '自动保存',
] as const

export function getWorkflowSteps(_imageEnabled: boolean): string[] {
  return [...WORKFLOW_STEPS_ALL]
}

/** 点击「生成文章」后执行的步骤（不含选题裂变） */
export function getArticleWorkflowSteps(_imageEnabled: boolean): string[] {
  return WORKFLOW_STEPS_ALL.filter((step) => step !== TOPIC_FISSION_STEP)
}

/** 直接排版模式：已有正文，从段内标记开始 */
export function getFormatWorkflowSteps(): string[] {
  return getArticleWorkflowSteps(false).filter((step) => step !== '正文初稿')
}

export function splitWorkflowRows(steps: string[]): string[][] {
  if (steps.length === 0) return []
  const firstRowCount = steps.length >= 8 ? 4 : 4
  if (steps.length <= firstRowCount) return [steps]
  return [steps.slice(0, firstRowCount), steps.slice(firstRowCount)]
}
