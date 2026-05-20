import { DEFAULT_LAYOUT_STYLE_ID, type LayoutStyleId } from './layoutStyles'

export type LayoutStyleSpec = {
  id: LayoutStyleId
  writingRules: string
  openQuoteFallback: string
  minSectionHeadings: number
  maxSectionHeadings: number
  sectionHeadingLabels: string[]
  sectionHeadingPositions: number[]
  minQuoteBlocks: number
  maxQuoteBlocks: number
  dividerText: string
  endingLines: [string, string]
  authorLine: string
  authorBio: string
  pastLinkTemplates: [string, string]
  minChars: number
  maxChars: number
}

/** 主题生文纯文本硬性输出规范（5 段式 + 排版参数表） */
export const THEME_ARTICLE_FORMAT_RULES = `
【主题生文 · 纯文本硬性输出格式】
你必须只输出可直接排版的正文纯文本，严格按下列顺序与符号，不得缺块、不得乱序、不得使用其它排版符号。

### 第一步：五段式骨架（缺一不可）
1. **金句开篇**：最顶独立一段，一句话点题（15～35 字）；**须原创、每次不同**，禁止照抄范例；**禁止与后文首句重复或拼接在同一段**。
2. **故事引入**：紧接分割线后，用具体生活画面/细节白描切入（如「对话框被新消息越推越往下」），自然过渡到主题；可用「原来」「后来才明白」等软性转折。
3. **分点论述**：2～3 个小标题，格式固定 \`｜标题文字\`（全角｜），每块讲透一个感受。
4. **金句引用**：穿插 1～2 行，每行以 \`❙ \` 开头（❙ 后空格），可 *斜体*，借用他人之口深化情绪。
5. **结尾升华**：短句/祝福收束 → 单独一行 \`✦\` → 1～2 句愿景 → \`文字 | 王哥\` + 一行简介 → 2 条 \`· 标题\` 往期链接。

### 第二步：文案风格
- **篇幅**：每段 ≤4 行；**正文不少于 1500 字**（含标点，建议 1500～2400 字）；段间空一行。
- **语气**：真诚、克制，像深夜聊天；不说教；用具体画面代替抽象形容。
- **禁止**：## / ###、--- / ✨、卡片框、==高亮==、编号章节、关注引导、[占位符]。

### 第三步：排版参数（编辑器渲染，正文勿写色值）
| 部位 | 字号 | 颜色 | 样式 |
| 顶部金句 | 18px | #C9A96E | 加粗居中 |
| 分割线 | 14px | #8B7E74 | ····· 居中 |
| 正文 | 15px | #333333 | 两端对齐 |
| 小标题 | 16px | #C9A96E | 加粗，｜开头 |
| 引用块 | 13px | #8B7E74 | 斜体，❙开头 |
| 结束符 | 16px | #C9A96E | ✦ 居中 |
| 作者信息 | 13px | #8B7E74 | 居中 |
| 往期链接 | 14px | #333333 | · 开头居中 |
全局：行距 1.75～2 倍，字间距 1px，页边距 16px，背景 #FFFFFF。

### 输出顺序模板（照此填空，内容须原创）
\`\`\`
[金句开篇一段]
·····
[故事引入：生活细节白描，2～4 个短段]
｜[小标题1]
[论述段落…]
❙ [引用1]
❙ [引用2，可选]
｜[小标题2]
[论述段落…]
｜[小标题3，可选]
[论述段落…]
✦
[收束短句，可换行]
文字 | 王哥
[一行简介]
· [往期标题1]
· [往期标题2]
\`\`\`

一句话指令：极简文艺风情感类推文 = 金句开篇 + ····· + 生活场景 + 2～3 个｜小标题 + 1～2 个❙引用 + ✦ 收束 + 作者信息 + ·往期；15px/#333333/1.75 行距；小标题与金句用 #C9A96E。
`.trim()

export const LAYOUT_STYLE_SPEC: LayoutStyleSpec = {
  id: DEFAULT_LAYOUT_STYLE_ID,
  openQuoteFallback: '有些人，光是遇见，就已经是上上签了。',
  minSectionHeadings: 2,
  maxSectionHeadings: 3,
  sectionHeadingLabels: [
    '我们曾并肩走过一段路',
    '成年人结束一段关系的方式',
    '谢谢你曾经来过',
  ],
  sectionHeadingPositions: [0.32, 0.55, 0.78],
  minQuoteBlocks: 1,
  maxQuoteBlocks: 2,
  dividerText: '·····',
  endingLines: ['愿你我在各自的人生里，', '继续闪亮。'],
  authorLine: '文字 | 王哥',
  authorBio: '一个收集人间故事的普通人',
  pastLinkTemplates: [
    '有些人，注定只能陪你走一段路',
    '最好的关系，是各自忙碌又互相牵挂',
  ],
  minChars: 1500,
  maxChars: 2400,
  writingRules: THEME_ARTICLE_FORMAT_RULES,
}

export const LAYOUT_STYLE_SPECS: Record<LayoutStyleId, LayoutStyleSpec> = {
  [DEFAULT_LAYOUT_STYLE_ID]: LAYOUT_STYLE_SPEC,
}

export function getLayoutStyleWritingRules(): string {
  return LAYOUT_STYLE_SPEC.writingRules
}

export function getThemeArticleCharRange(): { min: number; max: number } {
  return { min: LAYOUT_STYLE_SPEC.minChars, max: LAYOUT_STYLE_SPEC.maxChars }
}
