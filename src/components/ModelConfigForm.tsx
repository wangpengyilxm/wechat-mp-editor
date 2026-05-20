import { useEffect, useState } from 'react'
import { generateImageUrl } from '../services/imageGen'
import { chatCompletion } from '../services/llmClient'
import type { ModelProfile } from '../types'
import {
  normalizeModelProfile,
  validateModelProfile,
} from '../utils/modelProfile'

type ModelConfigFormProps = {
  value: ModelProfile
  onSave: (profile: ModelProfile) => void
  isTextModel?: boolean
}

export function ModelConfigForm({
  value,
  onSave,
  isTextModel = false,
}: ModelConfigFormProps) {
  const kind = isTextModel ? 'text' : 'image'
  const [draft, setDraft] = useState<ModelProfile>(value)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error'>('idle')
  const [testError, setTestError] = useState('')
  const [saveHint, setSaveHint] = useState('')

  useEffect(() => {
    setDraft(value)
    setTestResult('idle')
    setTestError('')
    setSaveHint('')
  }, [value])

  const update = (key: keyof ModelProfile, v: string) => {
    setDraft((prev) => ({ ...prev, [key]: v }))
    setTestResult('idle')
    setTestError('')
    setSaveHint('')
  }

  const handleTest = async () => {
    const validationError = validateModelProfile(draft, kind)
    if (validationError) {
      setTestResult('error')
      setTestError(validationError)
      return
    }

    const profile = normalizeModelProfile(draft, kind)
    setTesting(true)
    setTestResult('idle')
    setTestError('')

    try {
      if (isTextModel) {
        await chatCompletion(profile, [{ role: 'user', content: '只回复：连接成功' }], {
          temperature: 0,
        })
      } else {
        await generateImageUrl(profile, '一只白杯，极简静物摄影，低饱和')
      }
      setTestResult('success')
    } catch (err) {
      setTestResult('error')
      setTestError(err instanceof Error ? err.message : '连接测试失败')
    } finally {
      setTesting(false)
    }
  }

  const handleSave = () => {
    const validationError = validateModelProfile(draft, kind)
    if (validationError) {
      setTestResult('error')
      setTestError(validationError)
      return
    }

    if (testResult !== 'success') {
      setTestResult('error')
      setTestError('请先点击「测试连接」并确认成功后再保存')
      return
    }

    const saved = normalizeModelProfile(draft, kind)
    onSave(saved)
    setDraft(saved)
    setSaveHint('已保存，生成流程将使用当前配置')
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="厂商">
          <input
            type="text"
            value={draft.vendor}
            onChange={(e) => update('vendor', e.target.value)}
            placeholder="如 OpenAI、火山引擎"
            className="input-base py-2 text-xs"
          />
        </FormField>
        <FormField label="模型名称">
          <input
            type="text"
            value={draft.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder={isTextModel ? '接口要求的 model 名称' : '生图 model 名称'}
            className="input-base py-2 text-xs"
          />
        </FormField>
        <FormField label="模型链接">
          <input
            type="url"
            value={draft.endpoint}
            onChange={(e) => update('endpoint', e.target.value)}
            placeholder={
              isTextModel
                ? 'https://api.example.com/v1'
                : 'https://api.example.com/v1/images/generations'
            }
            className="input-base py-2 text-xs"
          />
        </FormField>
        <FormField label="API Key">
          <input
            type="password"
            value={draft.apiKey}
            onChange={(e) => update('apiKey', e.target.value)}
            placeholder="sk-... 或 ark-..."
            className="input-base py-2 text-xs"
            autoComplete="off"
          />
        </FormField>
      </div>

      <p className="text-[10px] leading-relaxed text-muted">
        请完整填写四项信息 → 点击「测试连接」验证可用 → 成功后再点「保存信息」。保存后才会用于选题、生文、配图。
      </p>

      {testResult === 'success' && (
        <p className="text-xs text-accent-dark">连接测试成功，可以保存</p>
      )}
      {testResult === 'error' && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700">
          {testError || '请检查模型链接、模型名称与 API Key 是否正确'}
        </p>
      )}

      {saveHint && <p className="text-xs font-medium text-accent-dark">{saveHint}</p>}

      <div className="flex justify-end gap-1.5 pt-1">
        <button type="button" onClick={handleSave} className="btn-primary px-3 py-1.5 text-[11px]">
          保存信息
        </button>
        <button
          type="button"
          onClick={handleTest}
          disabled={testing}
          className="btn-secondary px-3 py-1.5 text-[11px] disabled:opacity-50"
        >
          {testing ? '测试中…' : '测试连接'}
        </button>
      </div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      {children}
    </label>
  )
}
