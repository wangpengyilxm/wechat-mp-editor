import type { GenConfig } from '../types'
import { ensureMaleAuthorPrompts } from './authorPerspective'
import { normalizeModelProfile } from './modelProfile'

/** 供所有 AI 调用使用的运行时配置（与界面保存项一一对应） */
export type GenRuntime = {
  textModel: GenConfig['textModel']
  imageModel: GenConfig['imageModel']
  prompts: GenConfig['prompts']
  imageEnabled: boolean
  mpAccount: GenConfig['mpAccount']
}

export function buildGenRuntime(config: GenConfig, imageEnabled: boolean): GenRuntime {
  return {
    textModel: normalizeModelProfile(config.textModel, 'text'),
    imageModel: normalizeModelProfile(config.imageModel, 'image'),
    prompts: ensureMaleAuthorPrompts(config.prompts),
    imageEnabled,
    mpAccount: config.mpAccount,
  }
}

export function assertImageModelReady(model: GenRuntime['imageModel']): void {
  if (!model.endpoint.trim()) {
    throw new Error('请先在「模型配置」中配置生图模型链接')
  }
  if (!model.name.trim()) {
    throw new Error('请先在「模型配置」中配置生图模型名称')
  }
  if (!model.apiKey.trim()) {
    throw new Error('请先在「模型配置」中配置生图 API Key')
  }
}

export function assertTextModelReady(model: GenRuntime['textModel']): void {
  if (!model.endpoint) throw new Error('请先在「模型配置」中配置文本模型链接')
  if (!model.name) throw new Error('请先在「模型配置」中配置文本模型名称')
  if (!model.apiKey && !/11434|127\.0\.0\.1|ollama/i.test(model.endpoint)) {
    throw new Error('请先在「模型配置」中配置文本模型的 API Key')
  }
}
