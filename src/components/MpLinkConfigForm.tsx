import { useEffect, useState } from 'react'
import type { MpAccountConfig } from '../types'

type MpLinkConfigFormProps = {
  value: MpAccountConfig
  onSave: (account: MpAccountConfig) => void
}

export function MpLinkConfigForm({ value, onSave }: MpLinkConfigFormProps) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  const update = (patch: Partial<MpAccountConfig>) =>
    setDraft((prev) => ({ ...prev, ...patch }))

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-muted">AppID</span>
        <input
          type="text"
          value={draft.appId}
          onChange={(e) => update({ appId: e.target.value })}
          placeholder="wx..."
          autoComplete="off"
          className="input-base py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-muted">AppSecret</span>
        <input
          type="password"
          value={draft.appSecret}
          onChange={(e) => update({ appSecret: e.target.value })}
          placeholder="请输入 AppSecret"
          autoComplete="off"
          className="input-base py-2 text-sm"
        />
      </label>
      <p className="text-[11px] leading-relaxed text-muted">
        填写微信公众平台「开发 → 基本配置」中的 AppID 与 AppSecret，用于「同步至公众号草稿」。
        还需在公众平台配置 IP 白名单（本机公网 IP），并开启草稿箱相关接口权限。
      </p>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() =>
            onSave({
              appId: draft.appId.trim(),
              appSecret: draft.appSecret.trim(),
            })
          }
          className="btn-primary px-4 py-2 text-xs"
        >
          保存信息
        </button>
      </div>
    </div>
  )
}
