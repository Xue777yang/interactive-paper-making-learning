import 'dotenv/config'

export type DeepSeekMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type DeepSeekResult = {
  content: string
  mode: 'deepseek' | 'local'
}

const DEFAULT_BASE_URL = 'https://api.deepseek.com'
const DEFAULT_MODEL = 'deepseek-v4-flash'

export function hasDeepSeekConfig() {
  return Boolean(process.env.DEEPSEEK_API_KEY?.trim())
}

export async function chatWithDeepSeek(messages: DeepSeekMessage[]): Promise<DeepSeekResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim()
  if (!apiKey) return { content: '', mode: 'local' }

  const baseUrl = (process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '')
  const model = process.env.DEEPSEEK_MODEL || DEFAULT_MODEL
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      stream: false,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`DeepSeek request failed: ${response.status} ${body.slice(0, 240)}`)
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return {
    content: data.choices?.[0]?.message?.content?.trim() || '',
    mode: 'deepseek',
  }
}

export const cailunSystemPrompt = [
  '你是“蔡伦小助手”，面向中小学生讲解造纸术。',
  '回答范围限定在造纸术、蔡伦、古代造纸工艺、纸的传播、现代环保造纸、智能造纸和本课程学习内容。',
  '如果学生问无关问题，礼貌引导回造纸术学习。',
  '如果学生正在答题且题目尚未提交，不要直接说出正确选项，只能给启发式提示、相关概念解释或步骤提醒。',
  '学生提交答案后，可以解释正确答案和相关知识点。',
  '语言简洁、亲切、中文，不输出长篇无关内容。',
  '不要输出或保存任何 chain-of-thought，只给最终回答。',
].join('\n')

