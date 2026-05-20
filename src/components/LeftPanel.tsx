import type { WorkMode } from '../types'
import { ImageToggle } from './ImageToggle'
import { IconLayout, IconSparkle, IconWechat } from './icons'

type LeftPanelProps = {
  mode: WorkMode
  onModeChange: (mode: WorkMode) => void
  theme: string
  onThemeChange: (v: string) => void
  title: string
  onTitleChange: (v: string) => void
  body: string
  onBodyChange: (v: string) => void
  isGenerating: boolean
  isFormatting: boolean
  onGenerateFromTheme: () => void
  onFormat: () => void
  imageEnabled: boolean
  onImageEnabledChange: (enabled: boolean) => void
  fissionTitles: string[]
  fissionError: string | null
  generatingArticleTitle: string | null
  onGenerateArticle: (articleTitle: string) => void
}

export function LeftPanel({
  mode,
  onModeChange,
  theme,
  onThemeChange,
  title,
  onTitleChange,
  body,
  onBodyChange,
  isGenerating,
  isFormatting,
  onGenerateFromTheme,
  onFormat,
  imageEnabled,
  onImageEnabledChange,
  fissionTitles,
  fissionError,
  generatingArticleTitle,
  onGenerateArticle,
}: LeftPanelProps) {
  return (
    <aside className="flex min-h-0 flex-1 flex-col border-r border-border/60 bg-panel/80">
      <header className="flex items-center justify-between gap-3 border-b border-border/50 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent via-accent-soft to-accent-dark text-white shadow-md">
            <IconWechat />
          </div>
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold tracking-tight text-gradient">公众号智能助手</h1>
            <p className="text-xs text-muted">主题生文 · 一键排版</p>
          </div>
        </div>
        <ImageToggle enabled={imageEnabled} onChange={onImageEnabledChange} />
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="mb-4 flex rounded-xl p-1 neo-inset">
          <ModeTab
            active={mode === 'theme'}
            onClick={() => onModeChange('theme')}
            icon={<IconSparkle />}
            label="主题生文"
          />
          <ModeTab
            active={mode === 'direct'}
            onClick={() => onModeChange('direct')}
            icon={<IconLayout />}
            label="直接排版"
          />
        </div>

        {mode === 'theme' ? (
          <ThemeModeForm
            theme={theme}
            onThemeChange={onThemeChange}
            isGenerating={isGenerating}
            onGenerateFromTheme={onGenerateFromTheme}
            fissionTitles={fissionTitles}
            fissionError={fissionError}
            generatingArticleTitle={generatingArticleTitle}
            onGenerateArticle={onGenerateArticle}
          />
        ) : (
          <DirectModeForm
            title={title}
            onTitleChange={onTitleChange}
            body={body}
            onBodyChange={onBodyChange}
            isFormatting={isFormatting}
            onFormat={onFormat}
          />
        )}
      </div>
    </aside>
  )
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition-all ${
        active
          ? 'text-white shadow-md'
          : 'text-ink-secondary hover:text-accent-dark'
      }`}
      style={
        active
          ? {
              background: 'linear-gradient(135deg, #4338ca, #6366f1)',
              boxShadow: '0 3px 10px rgba(67, 56, 202, 0.35)',
            }
          : undefined
      }
    >
      {icon}
      {label}
    </button>
  )
}

function ThemeModeForm({
  theme,
  onThemeChange,
  isGenerating,
  onGenerateFromTheme,
  fissionTitles,
  fissionError,
  generatingArticleTitle,
  onGenerateArticle,
}: {
  theme: string
  onThemeChange: (v: string) => void
  isGenerating: boolean
  onGenerateFromTheme: () => void
  fissionTitles: string[]
  fissionError: string | null
  generatingArticleTitle: string | null
  onGenerateArticle: (articleTitle: string) => void
}) {
  return (
    <div className="space-y-4">
      <Field label="文章主题">
        <input
          type="text"
          value={theme}
          onChange={(e) => onThemeChange(e.target.value)}
          placeholder="例如：春季职场穿搭指南，适合 25-35 岁白领…"
          className="input-base"
          disabled={isGenerating}
        />
      </Field>

      <button
        type="button"
        onClick={onGenerateFromTheme}
        disabled={!theme.trim() || isGenerating || Boolean(generatingArticleTitle)}
        className="btn-primary w-full"
      >
        {isGenerating ? '正在裂变标题…' : '根据主题裂变文章标题'}
      </button>

      {fissionError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700">
          {fissionError}
        </p>
      )}

      {fissionTitles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted">已裂变 {fissionTitles.length} 个标题</p>
          <ul className="space-y-2">
            {fissionTitles.map((item, index) => {
              const isThisGenerating = generatingArticleTitle === item
              return (
                <li
                  key={`${index}-${item}`}
                  className="flex items-start gap-2 rounded-xl border border-border/40 bg-surface/80 p-2.5 neo-inset"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[10px] font-bold text-accent-dark">
                    {index + 1}
                  </span>
                  <p className="min-w-0 flex-1 text-[13px] leading-snug text-ink">{item}</p>
                  <button
                    type="button"
                    onClick={() => onGenerateArticle(item)}
                    disabled={isGenerating || Boolean(generatingArticleTitle)}
                    className="btn-secondary shrink-0 px-2.5 py-1.5 text-[11px] whitespace-nowrap"
                  >
                    {isThisGenerating ? '生成中…' : '生成文章'}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function DirectModeForm({
  title,
  onTitleChange,
  body,
  onBodyChange,
  isFormatting,
  onFormat,
}: {
  title: string
  onTitleChange: (v: string) => void
  body: string
  onBodyChange: (v: string) => void
  isFormatting: boolean
  onFormat: () => void
}) {
  return (
    <div className="space-y-4">
      <Field label="文章标题">
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="输入文章标题"
          className="input-base"
        />
      </Field>

      <Field label="文章正文">
        <textarea
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder="在此粘贴公众号草稿或 Word 正文…"
          rows={12}
          className="input-base resize-none font-mono text-[13px] leading-relaxed"
        />
      </Field>

      <button
        type="button"
        onClick={onFormat}
        disabled={!body.trim() || isFormatting}
        className="btn-primary w-full"
      >
        {isFormatting ? '排版处理中…' : '对正文进行排版'}
      </button>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium text-ink">{label}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  )
}
