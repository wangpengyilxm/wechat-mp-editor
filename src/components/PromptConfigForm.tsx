import type { PromptConfig } from '../types'

const PROMPT_FIELDS: { key: keyof PromptConfig; label: string; placeholder: string }[] = [
  {
    key: 'topicFission',
    label: '主题裂变',
    placeholder: '男性王哥视角：根据主题生成10个标题（勿女性第一人称）…',
  },
  {
    key: 'articleGen',
    label: '生成文章',
    placeholder: '极简文艺风：金句、·····、｜小标题、❙引用、✦、作者简介…',
  },
  {
    key: 'textToImage',
    label: '文生图',
    placeholder: '低饱和、胶片感、留白多的配图描述…',
  },
]

type PromptConfigFormProps = {
  value: PromptConfig
  onChange: (prompts: PromptConfig) => void
}

export function PromptConfigForm({ value, onChange }: PromptConfigFormProps) {
  const update = (key: keyof PromptConfig, text: string) =>
    onChange({ ...value, [key]: text })

  return (
    <div className="grid grid-cols-3 gap-3">
      {PROMPT_FIELDS.map(({ key, label, placeholder }) => (
        <label
          key={key}
          className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border/40 bg-surface/80 neo-inset"
        >
          <span className="border-b border-border/40 bg-panel/80 px-3 py-2 text-center text-xs font-semibold text-accent-dark">
            {label}
          </span>
          <textarea
            value={value[key]}
            onChange={(e) => update(key, e.target.value)}
            rows={9}
            placeholder={placeholder}
            className="min-h-[180px] flex-1 resize-none border-0 bg-transparent px-3 py-2.5 text-xs leading-relaxed text-ink outline-none focus:ring-2 focus:ring-accent/20 focus:ring-inset"
          />
        </label>
      ))}
    </div>
  )
}
