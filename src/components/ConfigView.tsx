import { useEffect, useState } from 'react'
import type { ConfigModalKey, GenConfig, ModelProfile, MpAccountConfig, PromptConfig } from '../types'
import { CombinedModelsForm } from './CombinedModelsForm'
import { ConfigModal } from './ConfigModal'
import { MpLinkConfigForm } from './MpLinkConfigForm'
import { PromptConfigForm } from './PromptConfigForm'

type ConfigViewProps = {
  config: GenConfig
  onConfigChange?: (config: GenConfig) => void
  onConfigPatch: (patch: Partial<GenConfig>) => void
}

const CONFIG_BUTTONS: { key: ConfigModalKey; label: string }[] = [
  { key: 'models', label: '模型配置' },
  { key: 'mpLink', label: '公众号链接' },
  { key: 'prompt', label: '提示词' },
]

function promptSummary(prompts: GenConfig['prompts']): string {
  const filled = [
    prompts.topicFission.trim(),
    prompts.articleGen.trim(),
    prompts.textToImage.trim(),
  ].filter(Boolean).length
  if (filled === 0) return '未设置'
  if (filled === 3) return '已全部配置'
  return `已配置 ${filled}/3`
}

function modelSummary(text: ModelProfile, image: ModelProfile): string {
  const t = text.name.trim() || text.vendor.trim()
  const i = image.name.trim() || image.vendor.trim()
  if (t && i) return `${t} · ${i}`
  if (t || i) return t || i
  return '未配置'
}

function mpAccountSummary(account: MpAccountConfig): string {
  const { appId, appSecret } = account
  if (!appId.trim() && !appSecret.trim()) return '未设置'
  if (appId.trim() && appSecret.trim()) {
    return appId.length > 14 ? `${appId.slice(0, 14)}…` : appId
  }
  return '未完成'
}

export function ConfigView({ config, onConfigPatch }: ConfigViewProps) {
  const [openModal, setOpenModal] = useState<ConfigModalKey | null>(null)
  const [promptDraft, setPromptDraft] = useState<PromptConfig>(config.prompts)

  useEffect(() => {
    if (openModal === 'prompt') {
      setPromptDraft(config.prompts)
    }
  }, [openModal, config.prompts])

  const update = (patch: Partial<GenConfig>) => onConfigPatch(patch)

  const summary: Record<ConfigModalKey, string> = {
    models: modelSummary(config.textModel, config.imageModel),
    mpLink: mpAccountSummary(config.mpAccount),
    prompt: promptSummary(config.prompts),
  }

  return (
    <>
      <div className="grid h-full grid-cols-1 gap-2">
        {CONFIG_BUTTONS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setOpenModal(key)}
            className="flex h-full min-h-0 flex-col items-center justify-center rounded-xl border border-border/40 bg-surface/80 px-3 py-2 text-center transition-all hover:border-accent/30 hover:bg-accent/8 neo-inset"
          >
            <span className="w-full text-center text-xs font-semibold text-ink">{label}</span>
            <span className="mt-1 w-full truncate px-1 text-center text-[10px] text-muted">{summary[key]}</span>
          </button>
        ))}
      </div>

      <ConfigModal
        open={openModal === 'models'}
        title="模型配置"
        onClose={() => setOpenModal(null)}
        footer={null}
        extraWide
      >
        <CombinedModelsForm
          textModel={config.textModel}
          imageModel={config.imageModel}
          onSaveText={(profile) => onConfigPatch({ textModel: profile })}
          onSaveImage={(profile) => onConfigPatch({ imageModel: profile })}
        />
      </ConfigModal>

      <ConfigModal
        open={openModal === 'mpLink'}
        title="公众号链接"
        onClose={() => setOpenModal(null)}
        footer={null}
      >
        <MpLinkConfigForm
          value={config.mpAccount}
          onSave={(account) => {
            update({ mpAccount: account })
            setOpenModal(null)
          }}
        />
      </ConfigModal>

      <ConfigModal
        open={openModal === 'prompt'}
        title="提示词"
        onClose={() => setOpenModal(null)}
        onConfirm={() => update({ prompts: promptDraft })}
        wide
      >
        <PromptConfigForm value={promptDraft} onChange={setPromptDraft} />
      </ConfigModal>
    </>
  )
}
