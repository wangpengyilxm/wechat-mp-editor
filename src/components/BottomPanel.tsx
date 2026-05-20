import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getWorkflowSteps, splitWorkflowRows } from '../config/workflowSteps'
import type {
  BottomTab,
  GenConfig,
  HistoryItem,
  WorkflowErrorInfo,
  WorkflowStatusMap,
  WorkflowStepStatus,
} from '../types'
import { ConfigView } from './ConfigView'
import { IconFlow, IconHistory, IconSettings } from './icons'

type BottomPanelProps = {
  activeTab: BottomTab
  onTabChange: (tab: BottomTab) => void
  config: GenConfig
  onConfigChange: (config: GenConfig) => void
  onConfigPatch: (patch: Partial<GenConfig>) => void
  history: HistoryItem[]
  onLoadHistory: (item: HistoryItem) => void
  imageEnabled: boolean
  workflowStatus: WorkflowStatusMap
  workflowError: WorkflowErrorInfo | null
}

const TABS: { id: BottomTab; label: string; icon: React.ReactNode }[] = [
  { id: 'workflow', label: '制作流程', icon: <IconFlow /> },
  { id: 'config', label: '生文配置', icon: <IconSettings /> },
  { id: 'history', label: '历史记录', icon: <IconHistory /> },
]

const MIN_HEIGHT = 120
const MAX_HEIGHT = 400
const DEFAULT_HEIGHT = 200

export function BottomPanel({
  activeTab,
  onTabChange,
  config,
  onConfigChange,
  onConfigPatch,
  history,
  onLoadHistory,
  imageEnabled,
  workflowStatus,
  workflowError,
}: BottomPanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [height, setHeight] = useState(DEFAULT_HEIGHT)
  const dragging = useRef(false)
  const startY = useRef(0)
  const startHeight = useRef(DEFAULT_HEIGHT)

  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (collapsed) return
      dragging.current = true
      startY.current = e.clientY
      startHeight.current = height
      e.preventDefault()
    },
    [collapsed, height],
  )

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const delta = startY.current - e.clientY
      const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight.current + delta))
      setHeight(next)
    }
    const onUp = () => {
      dragging.current = false
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  return (
    <section className="flex shrink-0 flex-col border-t border-border/50 bg-panel/60">
      {!collapsed && (
        <div
          role="separator"
          aria-label="拖动调节高度"
          onMouseDown={onResizeStart}
          className="group flex h-2 shrink-0 cursor-ns-resize items-center justify-center hover:bg-accent/10"
        >
          <span className="h-1 w-10 rounded-full bg-border transition-colors group-hover:bg-accent/50" />
        </div>
      )}

      <nav className="flex shrink-0 items-center border-b border-border/40">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-[3px] border-accent font-semibold text-accent-dark'
                : 'text-muted hover:text-accent-dark'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex h-full shrink-0 items-center justify-center border-l border-border/40 px-3 text-muted transition-colors hover:bg-accent/8 hover:text-accent-dark"
          aria-label={collapsed ? '展开面板' : '收缩面板'}
          title={collapsed ? '展开' : '收缩'}
        >
          <span
            className={`inline-block text-[10px] transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
          >
            {'\u25BC'}
          </span>
        </button>
      </nav>

      {!collapsed && (
        <div
          className={`px-5 py-3 ${activeTab === 'config' ? 'overflow-hidden' : 'overflow-y-auto'}`}
          style={{ height }}
        >
          {activeTab === 'workflow' && (
            <WorkflowView
              imageEnabled={imageEnabled}
              workflowStatus={workflowStatus}
              workflowError={workflowError}
            />
          )}
          {activeTab === 'config' && (
            <div className="h-full">
              <ConfigView
                config={config}
                onConfigChange={onConfigChange}
                onConfigPatch={onConfigPatch}
              />
            </div>
          )}
          {activeTab === 'history' && (
            <HistoryView history={history} onLoad={onLoadHistory} />
          )}
        </div>
      )}
    </section>
  )
}

function WorkflowView({
  imageEnabled,
  workflowStatus,
  workflowError,
}: {
  imageEnabled: boolean
  workflowStatus: WorkflowStatusMap
  workflowError: WorkflowErrorInfo | null
}) {
  const workflowRows = useMemo(() => {
    const steps = getWorkflowSteps(imageEnabled)
    return splitWorkflowRows(steps)
  }, [imageEnabled])

  let stepIndex = 0

  return (
    <div className="flex flex-col items-center gap-1">
      {!imageEnabled && (
        <p className="mb-1 w-full text-center text-[10px] text-muted">
          配图已关闭：图文排版步骤将使用占位图，不生图
        </p>
      )}
      {workflowRows.map((row, rowIdx) => (
        <Fragment key={rowIdx}>
          {rowIdx > 0 && <FlowArrow direction="down" />}
          <div className="flex w-full items-stretch justify-center gap-1">
            {row.map((title, colIdx) => {
              stepIndex += 1
              const step = stepIndex
              return (
                <Fragment key={title}>
                  {colIdx > 0 && <FlowArrow direction="right" />}
                  <WorkflowStepCard
                    step={step}
                    title={title}
                    status={workflowStatus[title] ?? 'idle'}
                  />
                </Fragment>
              )
            })}
          </div>
        </Fragment>
      ))}

      {workflowError && (
        <div
          className="mt-3 w-full rounded-xl border border-red-300/80 bg-red-50 px-3 py-2.5 text-left shadow-sm"
          role="alert"
        >
          <p className="text-xs font-semibold text-red-800">
            {'\u6b65\u9aa4\u300c'}
            {workflowError.step}
            {'\u300d\u6267\u884c\u5931\u8d25'}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-red-700">{workflowError.message}</p>
          {workflowError.hint && (
            <p className="mt-2 border-t border-red-200/80 pt-2 text-[11px] leading-relaxed text-red-600/90">
              {workflowError.hint}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function WorkflowStepCard({
  step,
  title,
  status,
}: {
  step: number
  title: string
  status: WorkflowStepStatus
}) {
  const statusClass =
    status === 'running'
      ? 'workflow-step-running'
      : status === 'completed'
        ? 'workflow-step-completed'
        : status === 'error'
          ? 'workflow-step-error'
          : 'border-border/40 bg-surface/80 neo-inset'

  const badgeClass =
    status === 'completed'
      ? 'bg-green-700/20 text-green-900'
      : status === 'running'
        ? 'bg-amber-600/25 text-amber-950'
        : status === 'error'
          ? 'bg-red-700/25 text-red-950'
          : 'bg-accent/15 text-accent-dark'

  return (
    <div
      className={`flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl border px-1.5 py-2 transition-colors ${statusClass}`}
      aria-current={status === 'running' ? 'step' : undefined}
    >
      <span
        className={`mb-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${badgeClass}`}
      >
        {step}
      </span>
      <p className="w-full text-center text-[10px] font-semibold leading-tight text-ink">{title}</p>
    </div>
  )
}

function FlowArrow({ direction }: { direction: 'right' | 'down' }) {
  if (direction === 'down') {
    return (
      <span className="flex h-4 shrink-0 items-center justify-center text-sm font-bold text-accent/70">
        {'\u2193'}
      </span>
    )
  }
  return (
    <span className="flex w-4 shrink-0 items-center justify-center self-center text-sm font-bold text-accent/70">
      {'\u2192'}
    </span>
  )
}

function HistoryView({
  history,
  onLoad,
}: {
  history: HistoryItem[]
  onLoad: (item: HistoryItem) => void
}) {
  if (history.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted">
        {'\u6682\u65e0\u5386\u53f2\u8bb0\u5f55\uff0c\u751f\u6210\u6587\u7ae0\u540e\u5c06\u81ea\u52a8\u4fdd\u5b58'}
      </p>
    )
  }

  return (
    <ul className="space-y-1.5">
      {history.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onLoad(item)}
            className="flex w-full items-center justify-between rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-border hover:bg-surface"
          >
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">{item.title}</span>
            <span className="ml-2 shrink-0 text-[10px] text-muted">
              {item.wordCount ? `${item.wordCount}\u5b57 \u00b7 ` : ''}
              {item.updatedAt}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
