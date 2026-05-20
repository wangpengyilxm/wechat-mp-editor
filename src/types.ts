export type WorkMode = 'theme' | 'direct'

export type BottomTab = 'workflow' | 'config' | 'history'

export type WorkflowStepStatus = 'idle' | 'running' | 'completed' | 'error'

export type WorkflowStatusMap = Record<string, WorkflowStepStatus>

export type WorkflowErrorInfo = {
  step: string
  message: string
  hint?: string
}

export type ConfigModalKey = 'models' | 'mpLink' | 'prompt'

export interface HistoryItem {
  id: string
  title: string
  mode: WorkMode
  updatedAt: string
  theme?: string
  draftBody?: string
  markedBody?: string
  finalHtml?: string
  plainTextDraft?: string
  wordCount?: number
  imageUrls?: string[]
  layoutStyle?: string
  resolvedLayoutStyle?: string
  createdAt?: string
}

export interface ModelProfile {
  vendor: string
  name: string
  endpoint: string
  apiKey: string
}

export interface PromptConfig {
  topicFission: string
  articleGen: string
  textToImage: string
}

export interface MpAccountConfig {
  appId: string
  appSecret: string
}

export interface GenConfig {
  textModel: ModelProfile
  imageModel: ModelProfile
  mpAccount: MpAccountConfig
  prompts: PromptConfig
}
