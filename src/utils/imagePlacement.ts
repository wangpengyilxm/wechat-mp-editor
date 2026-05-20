/** 计算配图插入位置：插在段落 index 之后（0-based），禁止首尾、禁止连续 */
export function computeImageInsertAfterIndices(
  paragraphCount: number,
  imageCount = 3,
): number[] {
  if (paragraphCount < 4 || imageCount <= 0) return []

  const minIdx = 1
  const maxIdx = paragraphCount - 2
  const indices: number[] = []

  for (let k = 1; k <= imageCount; k += 1) {
    let idx = Math.floor((k * paragraphCount) / (imageCount + 1))
    idx = Math.max(minIdx, Math.min(maxIdx, idx))

    let guard = 0
    while (
      guard < 20 &&
      (indices.includes(idx) ||
        indices.includes(idx - 1) ||
        indices.includes(idx + 1) ||
        idx < minIdx ||
        idx > maxIdx)
    ) {
      idx += 1
      if (idx > maxIdx) idx = minIdx + (indices.length > 0 ? indices[indices.length - 1] + 2 : 1)
      guard += 1
    }

    if (idx >= minIdx && idx <= maxIdx && !indices.includes(idx)) {
      indices.push(idx)
    }
  }

  return [...indices].sort((a, b) => a - b).slice(0, imageCount)
}
