import { getLayoutTheme } from '../config/layoutStyles'
import { renderWangGeArticleHtml } from './wangGeFormat'

export function toFormattedHtml(title: string, body: string, withImages = false): string {
  const theme = getLayoutTheme()
  return renderWangGeArticleHtml(title, body, theme, withImages, theme.label)
}
