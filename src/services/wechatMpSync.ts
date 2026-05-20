import { isNativeApp } from '../utils/platform'
import { syncArticleToWechatDraft as syncDraftNative } from './wechatDraftClient'

export type SyncToWechatDraftParams = {
  appId: string
  appSecret: string
  title: string
  html: string
  author?: string
}

export type SyncToWechatDraftResult = {
  draftMediaId: string
}

export async function syncToWechatDraft(
  params: SyncToWechatDraftParams,
): Promise<SyncToWechatDraftResult> {
  if (isNativeApp()) {
    const result = await syncDraftNative(params)
    return { draftMediaId: result.draftMediaId }
  }

  const res = await fetch('/api/wechat/sync-draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  let data: { ok?: boolean; message?: string; draftMediaId?: string }
  try {
    data = (await res.json()) as typeof data
  } catch {
    throw new Error('无法连接同步服务，请重启应用后重试。')
  }

  if (!res.ok || !data.ok || !data.draftMediaId) {
    throw new Error(data.message ?? `同步失败（HTTP ${res.status}）`)
  }

  return { draftMediaId: data.draftMediaId }
}
