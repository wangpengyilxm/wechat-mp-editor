import type { WorkflowErrorInfo } from '../types'

export function formatWorkflowError(step: string, err: unknown): WorkflowErrorInfo {
  const message = err instanceof Error ? err.message : String(err)

  let hint: string | undefined
  if (/JSON|parse|无法解析/i.test(message)) {
    hint = '该步骤需要模型返回结构化结果。可重试一次，或在「生文配置」中检查文本模型是否可用。'
  } else if (/connection|fetch|ECONNREFUSED|11434|ollama/i.test(message)) {
    hint = '无法连接模型服务。请在「模型配置」中检查链接与 API Key，测试成功后再保存。'
  } else if (/API Key|unauthorized|401/i.test(message)) {
    hint = '请在「配置 → 模型配置」中检查 API Key，测试连接成功后再保存。'
  } else if (/model.*not found|does not exist/i.test(message)) {
    hint = '模型名称不正确。请在「模型配置」中核对模型名称与接口文档是否一致。'
  } else if (/超时|timeout/i.test(message)) {
    hint = '请求超时，可稍后重试或换用响应更快的模型。'
  }

  return { step, message, hint }
}
