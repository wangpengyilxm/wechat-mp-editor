import type { ReactNode } from 'react'
import { rewriteHtmlImagesForPreview } from '../utils/previewImageUrl'

/** 公众号阅读区常见逻辑宽度（iPhone 标准屏） */
const MOBILE_PREVIEW_CLASS = 'mx-auto w-full max-w-[375px] min-w-0'

type PreviewPanelProps = {
  plainText: string
  formattedHtml: string
  isDraftLoading?: boolean
  showLayoutPending?: boolean
  onSyncDraft?: () => void
  isSyncingDraft?: boolean
}

export function PreviewPanel({
  plainText,
  formattedHtml,
  isDraftLoading = false,
  showLayoutPending = false,
  onSyncDraft,
  isSyncingDraft = false,
}: PreviewPanelProps) {
  return (
    <main className="neo-card flex h-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1">
        <PreviewPane title="纯文本预览" className="border-r border-border/50">
          {plainText ? (
            <div className="space-y-3">
              <pre className="w-full break-words whitespace-pre-wrap font-sans text-[14px] leading-[1.85] text-ink-secondary">
                {plainText}
              </pre>
              {showLayoutPending && (
                <p className="text-[11px] text-muted">后续排版步骤进行中…</p>
              )}
            </div>
          ) : isDraftLoading ? (
            <EmptyState text="正在撰写正文初稿，请稍候…" />
          ) : (
            <EmptyState text="正文初稿生成后将显示于此" />
          )}
        </PreviewPane>

        <PreviewPane
          title="排版预览"
          badge="同步至公众号草稿"
          badgeAction={onSyncDraft}
          badgeDisabled={!formattedHtml || isSyncingDraft}
          badgeLabel={isSyncingDraft ? '同步中…' : undefined}
        >
          {formattedHtml ? (
            <div
              className="formatted-article"
              dangerouslySetInnerHTML={{
                __html: rewriteHtmlImagesForPreview(formattedHtml),
              }}
            />
          ) : isDraftLoading ? (
            <EmptyState text="初稿完成后将自动排版…" />
          ) : (
            <EmptyState text="排版完成后将在此展示成品" />
          )}
        </PreviewPane>
      </div>
    </main>
  )
}

function PreviewPane({
  title,
  badge,
  badgeLabel,
  badgeAction,
  badgeDisabled = false,
  className = '',
  children,
}: {
  title: string
  badge?: string
  badgeLabel?: string
  badgeAction?: () => void
  badgeDisabled?: boolean
  className?: string
  children: ReactNode
}) {
  const showAction = Boolean(badgeAction && badge)

  const actionBtnClass = (disabled: boolean) =>
    disabled
      ? 'inline-flex h-9 cursor-not-allowed items-center rounded-xl border-2 border-border bg-surface px-4 text-[11px] font-semibold text-muted'
      : 'btn-primary inline-flex h-9 shrink-0 items-center !py-0 px-4 text-xs shadow-[0_4px_16px_rgba(67,56,202,0.5)]'

  return (
    <section className={`flex w-1/2 min-w-0 flex-col bg-panel/50 ${className}`}>
      <header className="relative flex h-14 shrink-0 items-center justify-center border-b border-border/40 px-4">
        <h2 className="text-center text-xs font-semibold text-ink-secondary">{title}</h2>
        {showAction && badge && (
          <div className="absolute right-4 flex h-9 shrink-0 items-center">
            <button
              type="button"
              onClick={badgeAction}
              disabled={badgeDisabled}
              className={actionBtnClass(badgeDisabled)}
            >
              {badgeLabel ?? badge}
            </button>
          </div>
        )}
      </header>
      <div className="flex-1 overflow-y-auto bg-surface/40 p-5">
        <div className={`neo-card min-h-[200px] p-4 ${MOBILE_PREVIEW_CLASS}`}>{children}</div>
      </div>
    </section>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-full min-h-[160px] flex-col items-center justify-center text-center">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full text-lg text-accent/60 neo-inset">
        ✦
      </div>
      <p className="max-w-[200px] text-xs leading-relaxed text-muted">{text}</p>
    </div>
  )
}
