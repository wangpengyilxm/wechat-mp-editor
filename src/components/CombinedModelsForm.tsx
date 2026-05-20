import type { ModelProfile } from '../types'
import { ModelConfigForm } from './ModelConfigForm'

type CombinedModelsFormProps = {
  textModel: ModelProfile
  imageModel: ModelProfile
  onSaveText: (profile: ModelProfile) => void
  onSaveImage: (profile: ModelProfile) => void
}

export function CombinedModelsForm({
  textModel,
  imageModel,
  onSaveText,
  onSaveImage,
}: CombinedModelsFormProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <section className="flex min-w-0 flex-col border-r border-border/40 pr-4">
        <h3 className="mb-3 text-center text-xs font-semibold text-ink">文本模型</h3>
        <ModelConfigForm value={textModel} onSave={onSaveText} isTextModel />
      </section>
      <section className="min-w-0">
        <h3 className="mb-3 text-center text-xs font-semibold text-ink">图片模型</h3>
        <ModelConfigForm value={imageModel} onSave={onSaveImage} />
      </section>
    </div>
  )
}
