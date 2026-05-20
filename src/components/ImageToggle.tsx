type ImageToggleProps = {
  enabled: boolean
  onChange: (enabled: boolean) => void
}

export function ImageToggle({ enabled, onChange }: ImageToggleProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 select-none">
      <span className="text-xs text-ink-secondary">配图</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          enabled ? 'bg-gradient-to-r from-accent-dark to-accent' : 'neo-inset'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
      <span className={`text-xs font-medium ${enabled ? 'text-accent-dark' : 'text-muted'}`}>
        {enabled ? '已开启' : '已关闭'}
      </span>
    </label>
  )
}
