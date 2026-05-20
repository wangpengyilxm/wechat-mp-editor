import type { WorkflowStatusMap } from '../types'

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export function createIdleWorkflowStatus(steps: string[]): WorkflowStatusMap {
  return Object.fromEntries(steps.map((step) => [step, 'idle' as const]))
}

export async function runWorkflowSteps(
  steps: string[],
  onUpdate: (statuses: WorkflowStatusMap) => void,
  options?: { stepMs?: number; failAt?: string },
): Promise<boolean> {
  const stepMs = options?.stepMs ?? 380
  const statuses = createIdleWorkflowStatus(steps)

  for (const step of steps) {
    statuses[step] = 'running'
    onUpdate({ ...statuses })
    await delay(stepMs)

    if (options?.failAt === step) {
      statuses[step] = 'error'
      onUpdate({ ...statuses })
      return false
    }

    statuses[step] = 'completed'
    onUpdate({ ...statuses })
  }

  return true
}
