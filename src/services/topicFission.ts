import type { GenRuntime } from '../utils/genRuntime'

import { assertTextModelReady } from '../utils/genRuntime'

import {

  buildMaleAuthorTitleRetryUserMessage,

  countFemaleAuthorTitles,

  ensureMaleAuthorPrompt,

  looksLikeFemaleAuthorTitle,

  MALE_AUTHOR_SYSTEM_PROMPT,

  MALE_AUTHOR_USER_REMINDER,

} from '../utils/authorPerspective'

import { parseTitleList } from '../utils/parseTitles'

import { chatCompletion } from './llmClient'



const MAX_TITLE_RETRIES = 2



async function requestTitles(theme: string, runtime: GenRuntime, retry: boolean): Promise<string> {

  const fissionGuide = ensureMaleAuthorPrompt(runtime.prompts.topicFission)



  const userContent = retry

    ? buildMaleAuthorTitleRetryUserMessage(theme)

    : `${fissionGuide}



---

【本次任务】



${MALE_AUTHOR_USER_REMINDER}



主题：${theme}



请严格按上文要求，为该主题生成正好 10 个文章标题。

- 必须是男性作者在说话的标题

- 结婚/恋爱勿用新娘、出嫁、女性嫁人视角

- 只输出标题列表，每行一个，可带序号，不要任何解释`



  return chatCompletion(

    runtime.textModel,

    [

      { role: 'system', content: MALE_AUTHOR_SYSTEM_PROMPT },

      { role: 'user', content: userContent },

    ],

    { temperature: retry ? 0.45 : 0.7 },

  )

}



export async function generateTopicTitles(

  theme: string,

  runtime: GenRuntime,

): Promise<string[]> {

  const topic = theme.trim()

  if (!topic) {

    throw new Error('请先输入文章主题')

  }

  if (!runtime.prompts.topicFission.trim()) {

    throw new Error('请先在「提示词」中配置主题裂变提示词')

  }



  assertTextModelReady(runtime.textModel)



  let content = await requestTitles(topic, runtime, false)

  let titles = parseTitleList(content)



  for (let attempt = 0; attempt < MAX_TITLE_RETRIES; attempt += 1) {

    const badCount = countFemaleAuthorTitles(titles)

    if (badCount === 0 && titles.length >= 8) break



    content = await requestTitles(topic, runtime, true)

    titles = parseTitleList(content)

  }



  const filtered = titles.filter((t) => !looksLikeFemaleAuthorTitle(t))

  if (filtered.length >= 8) return filtered.slice(0, 10)

  if (titles.length > 0) return titles.slice(0, 10)



  throw new Error('未能生成符合男性作者视角的标题，请检查提示词或更换模型后重试')

}


