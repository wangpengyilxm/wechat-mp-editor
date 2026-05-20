export const DEFAULT_LAYOUT_STYLE_ID = '极简文艺风' as const

export type LayoutStyleId = typeof DEFAULT_LAYOUT_STYLE_ID

/** 极简文艺风配色 */
export const LITERARY_COLORS = {
  text: '#333333',
  muted: '#8B7E74',
  accent: '#C9A96E',
  background: '#FFFFFF',
} as const

export type LayoutStyleTheme = {
  id: LayoutStyleId
  label: string
  accent: string
  muted: string
  text: string
  background: string
  tone: string
  description: string
}

export const DEFAULT_LAYOUT_THEME: LayoutStyleTheme = {
  id: DEFAULT_LAYOUT_STYLE_ID,
  label: '极简文艺风',
  accent: LITERARY_COLORS.accent,
  muted: LITERARY_COLORS.muted,
  text: LITERARY_COLORS.text,
  background: LITERARY_COLORS.background,
  tone: '哑金 · 暖灰棕',
  description: '读书、情感、生活方式、个人 IP',
}

export function getLayoutTheme(): LayoutStyleTheme {
  return DEFAULT_LAYOUT_THEME
}
