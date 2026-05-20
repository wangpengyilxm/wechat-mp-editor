import { DEFAULT_LAYOUT_STYLE_ID, getLayoutTheme, type LayoutStyleId, type LayoutStyleTheme } from '../config/layoutStyles'

export type LayoutRenderParams = {
  lineHeight: number
  letterSpacing: number
  paragraphGap: number
}

export type MatchedLayout = {
  theme: LayoutStyleTheme
  resolvedId: LayoutStyleId
  params: LayoutRenderParams
  moodTags: string[]
}

export function buildLayout(_seed: string, moodTags: string[]): MatchedLayout {
  return {
    theme: getLayoutTheme(),
    resolvedId: DEFAULT_LAYOUT_STYLE_ID,
    params: {
      lineHeight: 1.85,
      letterSpacing: 1,
      paragraphGap: 18,
    },
    moodTags,
  }
}
