import type { ModelProfile } from '../types'

import { normalizeModelProfile } from '../utils/modelProfile'



type ImageApiResponse = {

  data?: { url?: string; b64_json?: string }[]

  url?: string

  error?: { message?: string; code?: string }

}



function resolveImageSize(endpoint: string): string {

  if (/volces\.com/i.test(endpoint)) return '2K'

  return '1024x1024'

}



function preferBase64Response(endpoint: string): boolean {

  return /volces\.com|ark\.cn-beijing/i.test(endpoint)

}



function parseImageError(raw: string, status: number): string {

  try {

    const err = JSON.parse(raw) as ImageApiResponse

    const msg = err.error?.message

    if (msg) return msg

  } catch {

    // use raw

  }

  if (status === 401) return '生图 API Key 无效或未授权'

  if (status === 404) return '生图模型或接口地址不正确，请检查「模型配置」'

  return raw.slice(0, 280) || `生图请求失败（HTTP ${status}）`

}



function extractImageUrl(data: ImageApiResponse, asBase64: boolean): string {

  if (asBase64) {

    const b64 = data.data?.[0]?.b64_json

    if (b64) return `data:image/png;base64,${b64}`

  }



  const url = data.data?.[0]?.url ?? data.url

  if (url) return url



  const b64 = data.data?.[0]?.b64_json

  if (b64) return `data:image/png;base64,${b64}`



  return ''

}



async function requestImage(

  profile: ModelProfile,

  prompt: string,

  responseFormat: 'url' | 'b64_json',

): Promise<string> {

  const response = await fetch(profile.endpoint, {

    method: 'POST',

    headers: {

      'Content-Type': 'application/json',

      Authorization: `Bearer ${profile.apiKey}`,

    },

    body: JSON.stringify({

      model: profile.name,

      prompt: prompt.trim(),

      response_format: responseFormat,

      size: resolveImageSize(profile.endpoint),

      watermark: false,

      n: 1,

    }),

  })



  const raw = await response.text()

  if (!response.ok) {

    throw new Error(parseImageError(raw, response.status))

  }



  let data: ImageApiResponse

  try {

    data = JSON.parse(raw) as ImageApiResponse

  } catch {

    throw new Error('生图接口返回无法解析')

  }



  const url = extractImageUrl(data, responseFormat === 'b64_json')

  if (!url) {

    throw new Error('生图接口未返回图片，请检查模型名称与 response_format 配置')

  }

  return url

}



export async function generateImageUrl(model: ModelProfile, prompt: string): Promise<string> {

  const profile = normalizeModelProfile(model, 'image')

  if (!profile.endpoint.trim()) {

    throw new Error('请先在「模型配置」中配置生图模型链接')

  }

  if (!profile.apiKey.trim()) {

    throw new Error('请先在「模型配置」中配置生图 API Key')

  }

  if (!profile.name.trim()) {

    throw new Error('请先在「模型配置」中配置生图模型名称')

  }



  const useBase64 = preferBase64Response(profile.endpoint)



  if (useBase64) {

    try {

      return await requestImage(profile, prompt, 'b64_json')

    } catch {

      return await requestImage(profile, prompt, 'url')

    }

  }



  try {

    return await requestImage(profile, prompt, 'url')

  } catch {

    return await requestImage(profile, prompt, 'b64_json')

  }

}


