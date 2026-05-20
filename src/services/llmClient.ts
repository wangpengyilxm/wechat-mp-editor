import type { ModelProfile } from '../types'

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

function resolveChatCompletionsUrl(endpoint: string): string {
  const trimmed = endpoint.trim().replace(/\/+$/, '')
  if (trimmed.endsWith('/chat/completions')) return trimmed
  return `${trimmed}/chat/completions`
}

function isOllamaEndpoint(endpoint: string): boolean {
  return /11434|ollama/i.test(endpoint) || endpoint.includes('127.0.0.1')
}

function formatModelError(detail: string, model: ModelProfile): string {
  const name = model.name.trim()
  if (/model.*not found/i.test(detail) || /does not exist/i.test(detail)) {
    if (isOllamaEndpoint(model.endpoint)) {
      return `本地模型「${name}」未找到。请确认 Ollama 已启动并已执行 ollama pull ${name}。`
    }
    return `模型「${name}」不可用：${detail}。请检查「模型配置」中的模型名称与 API Key。`
  }
  if (/connection refused|failed to fetch|network/i.test(detail)) {
    if (isOllamaEndpoint(model.endpoint)) {
      return '无法连接本地接口（127.0.0.1:11434）。请确认服务已启动且模型链接正确。'
    }
    return `网络连接失败：${detail}`
  }
  if (/unauthorized|invalid.*api.*key|401/i.test(detail)) {
    return 'API Key 无效或未填写，请在「模型配置」中检查并保存。'
  }
  return detail
}

export async function chatCompletion(
  model: ModelProfile,
  messages: ChatMessage[],
  options?: { temperature?: number },
): Promise<string> {
  if (!model.endpoint.trim()) {
    throw new Error('请先在「模型配置」中填写文本模型的接口地址')
  }
  if (!model.name.trim()) {
    throw new Error('请先在「模型配置」中填写文本模型名称')
  }
  if (!model.apiKey.trim() && !isOllamaEndpoint(model.endpoint)) {
    throw new Error('请先在「模型配置」中填写文本模型的 API Key')
  }

  const response = await fetch(resolveChatCompletionsUrl(model.endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${model.apiKey.trim() || 'ollama'}`,
    },
    body: JSON.stringify({
      model: model.name,
      messages,
      temperature: options?.temperature ?? 0.85,
    }),
  })

  const raw = await response.text()
  if (!response.ok) {
    let detail = raw.slice(0, 300)
    try {
      const err = JSON.parse(raw) as { error?: { message?: string } }
      detail = err.error?.message ?? detail
    } catch {
      // use raw text
    }
    throw new Error(formatModelError(detail, model))
  }

  let data: { choices?: { message?: { content?: string } }[] }
  try {
    data = JSON.parse(raw) as { choices?: { message?: { content?: string } }[] }
  } catch {
    throw new Error('模型返回了无法解析的数据')
  }

  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw new Error('模型未返回有效文本内容')
  }

  return content
}
