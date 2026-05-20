/** 中文公众号字数：汉字 + 标点，不含空白与换行 */
export function countArticleWords(text: string): number {
  const stripped = text.replace(/\s+/g, '')
  if (!stripped) return 0
  const matches = stripped.match(/[\u4e00-\u9fff\u3400-\u4dbf\w]|[^\s\w]/g)
  return matches?.length ?? stripped.length
}
