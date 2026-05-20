import type { ReactNode } from 'react'
import { useEffect } from 'react'

type ConfigModalProps = {
  open: boolean
  title: string
  onClose: () => void
  onConfirm?: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
  extraWide?: boolean
}

export function ConfigModal({
  open,
  title,
  onClose,
  onConfirm,
  children,
  footer,
  wide = false,
  extraWide = false,
}: ConfigModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const handleConfirm = () => {
    onConfirm?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="关闭"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="config-modal-title"
        className={`relative z-10 w-full rounded-2xl neo-card ${
          extraWide ? 'max-w-5xl' : wide ? 'max-w-4xl' : 'max-w-lg'
        }`}
      >
        <header className="relative flex h-12 items-center justify-center border-b border-border px-12">
          <h2 id="config-modal-title" className="text-center text-sm font-semibold text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </header>
        <div className="px-5 py-4">{children}</div>
        {footer !== undefined ? (
          footer
        ) : (
          <footer className="flex justify-end gap-2 border-t border-border px-5 py-3">
            <button type="button" onClick={handleConfirm} className="btn-primary px-5 py-2 text-xs">
              确定
            </button>
          </footer>
        )}
      </div>
    </div>
  )
}
