import type { ModelProfile } from '../types'

function isOllamaEndpoint(endpoint: string): boolean {
  return /11434|ollama/i.test(endpoint) || endpoint.includes('127.0.0.1')
}

/** 规范化模型接口地址，避免保存不完整导致请求失败 */
export function normalizeModelEndpoint(profile: ModelProfile, kind: 'text' | 'image'): ModelProfile {
  let endpoint = profile.endpoint.trim().replace(/\/+$/, '')

  if (kind === 'text') {
    if (isOllamaEndpoint(endpoint) && !/\/v1(\/|$)/i.test(endpoint)) {
      endpoint = `${endpoint}/v1`
    }
    return { ...profile, endpoint }
  }

  if (endpoint.includes('volces.com') || endpoint.includes('ark.cn-beijing')) {
    if (!endpoint.endsWith('/images/generations')) {
      if (endpoint.endsWith('/api/v3')) {
        endpoint = `${endpoint}/images/generations`
      } else if (endpoint.endsWith('/api')) {
        endpoint = `${endpoint}/v3/images/generations`
      } else if (!endpoint.includes('/images/')) {
        endpoint = `${endpoint}/api/v3/images/generations`
      }
    }
  } else if (endpoint.endsWith('/v1')) {
    endpoint = `${endpoint}/images/generations`
  } else if (endpoint.endsWith('/v1/')) {
    endpoint = `${endpoint}images/generations`
  } else if (!endpoint.includes('/images/generations') && /\/v\d+$/i.test(endpoint)) {
    endpoint = `${endpoint}/images/generations`
  }

  return { ...profile, endpoint }
}

export function normalizeModelProfile(profile: ModelProfile, kind: 'text' | 'image'): ModelProfile {
  return normalizeModelEndpoint(
    {
      vendor: profile.vendor.trim(),
      name: profile.name.trim(),
      endpoint: profile.endpoint.trim(),
      apiKey: profile.apiKey.trim(),
    },
    kind,
  )
}

export function validateModelProfile(
  profile: ModelProfile,
  kind: 'text' | 'image',
): string | null {
  const p = normalizeModelProfile(profile, kind)
  if (!p.vendor.trim()) return '请填写厂商'
  if (!p.name.trim()) return '请填写模型名称'
  if (!p.endpoint.trim()) return '请填写模型链接'
  if (!p.apiKey.trim() && !(kind === 'text' && isOllamaEndpoint(p.endpoint))) {
    return '请填写 API Key'
  }
  try {
    const url = new URL(
      kind === 'text'
        ? p.endpoint.endsWith('/chat/completions')
          ? p.endpoint
          : `${p.endpoint.replace(/\/+$/, '')}/chat/completions`
        : p.endpoint,
    )
    if (!/^https?:$/i.test(url.protocol)) return '模型链接须以 http:// 或 https:// 开头'
  } catch {
    return '模型链接格式不正确，请填写完整 URL'
  }
  return null
}
