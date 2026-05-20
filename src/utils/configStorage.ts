import type { GenConfig, HistoryItem, ModelProfile, MpAccountConfig, PromptConfig } from '../types'
import { ensureMaleAuthorPrompts } from './authorPerspective'
import { normalizeModelProfile } from './modelProfile'

const CONFIG_STORAGE_KEY = 'wechat-mp-editor:config'
const LEGACY_MP_ACCOUNT_KEY = 'wechat-mp-editor:mp-account'
const PREFS_STORAGE_KEY = 'wechat-mp-editor:prefs'
const HISTORY_STORAGE_KEY = 'wechat-mp-editor:history'

export type AppPreferences = {
  imageEnabled: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readModelProfile(value: unknown, fallback: ModelProfile): ModelProfile {
  if (!isRecord(value)) return fallback
  return {
    vendor: typeof value.vendor === 'string' ? value.vendor : fallback.vendor,
    name: typeof value.name === 'string' ? value.name : fallback.name,
    endpoint: typeof value.endpoint === 'string' ? value.endpoint : fallback.endpoint,
    apiKey: typeof value.apiKey === 'string' ? value.apiKey : fallback.apiKey,
  }
}

function readPrompts(value: unknown, fallback: PromptConfig): PromptConfig {
  if (!isRecord(value)) return fallback
  return {
    topicFission:
      typeof value.topicFission === 'string' ? value.topicFission : fallback.topicFission,
    articleGen: typeof value.articleGen === 'string' ? value.articleGen : fallback.articleGen,
    textToImage: typeof value.textToImage === 'string' ? value.textToImage : fallback.textToImage,
  }
}

function readMpAccount(value: unknown, fallback: MpAccountConfig): MpAccountConfig {
  if (!isRecord(value)) return fallback
  return {
    appId: typeof value.appId === 'string' ? value.appId : fallback.appId,
    appSecret: typeof value.appSecret === 'string' ? value.appSecret : fallback.appSecret,
  }
}

export function normalizeGenConfig(config: GenConfig): GenConfig {
  return {
    ...config,
    textModel: normalizeModelProfile(config.textModel, 'text'),
    imageModel: normalizeModelProfile(config.imageModel, 'image'),
  }
}

export function loadStoredConfig(fallback: GenConfig): GenConfig {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY)
    if (raw) {
      const data: unknown = JSON.parse(raw)
      if (isRecord(data)) {
        return {
          textModel: normalizeModelProfile(
            readModelProfile(data.textModel, fallback.textModel),
            'text',
          ),
          imageModel: normalizeModelProfile(
            readModelProfile(data.imageModel, fallback.imageModel),
            'image',
          ),
          mpAccount: readMpAccount(data.mpAccount, fallback.mpAccount),
          prompts: ensureMaleAuthorPrompts(
            readPrompts(data.prompts, fallback.prompts),
            fallback.prompts,
          ),
        }
      }
    }
  } catch {
    // ignore corrupt storage
  }

  return fallback
}

export function saveStoredConfig(config: GenConfig): void {
  const normalized = normalizeGenConfig(config)
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    // quota / private mode
  }
}

export function loadPreferences(fallback: AppPreferences): AppPreferences {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY)
    if (!raw) return fallback
    const data: unknown = JSON.parse(raw)
    if (isRecord(data) && typeof data.imageEnabled === 'boolean') {
      return { imageEnabled: data.imageEnabled }
    }
  } catch {
    // ignore
  }
  return fallback
}

export function savePreferences(prefs: AppPreferences): void {
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // ignore
  }
}

function readHistoryItem(value: unknown): HistoryItem | null {
  if (!isRecord(value)) return null
  if (
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    (value.mode !== 'theme' && value.mode !== 'direct') ||
    typeof value.updatedAt !== 'string'
  ) {
    return null
  }
  const item: HistoryItem = {
    id: value.id,
    title: value.title,
    mode: value.mode,
    updatedAt: value.updatedAt,
  }
  if (typeof value.theme === 'string') item.theme = value.theme
  if (typeof value.draftBody === 'string') item.draftBody = value.draftBody
  if (typeof value.markedBody === 'string') item.markedBody = value.markedBody
  if (typeof value.finalHtml === 'string') item.finalHtml = value.finalHtml
  if (typeof value.plainTextDraft === 'string') item.plainTextDraft = value.plainTextDraft
  if (typeof value.wordCount === 'number') item.wordCount = value.wordCount
  if (Array.isArray(value.imageUrls)) {
    item.imageUrls = value.imageUrls.filter((u): u is string => typeof u === 'string')
  }
  if (typeof value.layoutStyle === 'string') item.layoutStyle = value.layoutStyle
  if (typeof value.resolvedLayoutStyle === 'string') {
    item.resolvedLayoutStyle = value.resolvedLayoutStyle
  }
  if (typeof value.createdAt === 'string') item.createdAt = value.createdAt
  return item
}

export function loadHistory(fallback: HistoryItem[]): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
    if (!raw) return fallback
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) return fallback
    const items = data.map(readHistoryItem).filter((item): item is HistoryItem => item !== null)
    return items.length > 0 ? items : fallback
  } catch {
    return fallback
  }
}

export function saveHistory(history: HistoryItem[]): void {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
  } catch {
    // ignore
  }
}

/** 清除本机全部应用配置（模型、公众号、提示词、历史、偏好） */
export function clearAllAppStorage(): void {
  for (const key of [
    CONFIG_STORAGE_KEY,
    LEGACY_MP_ACCOUNT_KEY,
    PREFS_STORAGE_KEY,
    HISTORY_STORAGE_KEY,
  ]) {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
  }
}

export const APP_STORAGE_KEYS = [
  CONFIG_STORAGE_KEY,
  LEGACY_MP_ACCOUNT_KEY,
  PREFS_STORAGE_KEY,
  HISTORY_STORAGE_KEY,
] as const
