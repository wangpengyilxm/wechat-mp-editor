/** 从模型输出中解析编号标题列表 */
export function parseTitleList(text: string): string[] {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const titles: string[] = []

  for (const line of lines) {
    if (line.startsWith('#') || line.startsWith('```')) continue

    const cleaned = line
      .replace(/^[-*•]\s*/, '')
      .replace(/^\d+[\.\)、．]\s*/, '')
      .replace(/^\*\*|\*\*$/g, '')
      .trim()

    if (!cleaned || cleaned.length > 60) continue
    if (/^主题[：:]/.test(cleaned)) continue
    if (/^示例|^输出|^要求/.test(cleaned)) continue

    titles.push(cleaned)
  }

  const unique = [...new Set(titles)]
  if (unique.length === 0) {
    throw new Error('未能从模型回复中解析出标题，请检查提示词或重试')
  }

  return unique.slice(0, 10)
}
