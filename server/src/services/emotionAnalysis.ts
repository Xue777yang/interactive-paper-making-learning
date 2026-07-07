import { chatWithDeepSeek, hasDeepSeekConfig } from './deepseekClient.js'
import { clamp, safeJsonParse } from '../utils.js'

export type EmotionLabel = 'curious' | 'confused' | 'frustrated' | 'anxious' | 'bored' | 'confident' | 'neutral'
export type RiskLevel = 'none' | 'low' | 'medium'

export type EmotionAnalysisResult = {
  emotionLabel: EmotionLabel
  valence: number
  arousal: number
  confidence: number
  summary: string
  riskLevel: RiskLevel
}

const emotionLabels: EmotionLabel[] = [
  'curious',
  'confused',
  'frustrated',
  'anxious',
  'bored',
  'confident',
  'neutral',
]

const riskLevels: RiskLevel[] = ['none', 'low', 'medium']

export async function analyzeLearningEmotion(text: string): Promise<EmotionAnalysisResult> {
  if (hasDeepSeekConfig()) {
    try {
      const result = await chatWithDeepSeek([
        {
          role: 'system',
          content:
            '你只做学习状态倾向分析，不做医学或心理诊断。仅返回 JSON，不要额外解释。字段必须为 emotionLabel、valence、arousal、confidence、summary、riskLevel。',
        },
        {
          role: 'user',
          content: `请分析这段学生学习提问的状态倾向，分类只能是 curious/confused/frustrated/anxious/bored/confident/neutral，riskLevel 只能是 none/low/medium：\n${text}`,
        },
      ])
      const parsed = safeJsonParse<Partial<EmotionAnalysisResult>>(extractJson(result.content), {})
      return normalizeEmotionResult(parsed, text)
    } catch {
      return localEmotionFallback(text)
    }
  }

  return localEmotionFallback(text)
}

function localEmotionFallback(text: string): EmotionAnalysisResult {
  const normalized = text.toLowerCase()
  if (/不会|看不懂|什么意思|為什么|为什么|不理解|没懂/.test(normalized)) {
    return {
      emotionLabel: 'confused',
      valence: -0.22,
      arousal: 0.52,
      confidence: 0.78,
      summary: '学生对当前知识点或步骤存在理解困惑，适合给出分步提示。',
      riskLevel: 'low',
    }
  }

  if (/太难|不想做|烦|崩溃|受不了|做不出/.test(normalized)) {
    return {
      emotionLabel: 'frustrated',
      valence: -0.46,
      arousal: 0.72,
      confidence: 0.76,
      summary: '学生表现出挫败感，建议降低任务粒度并给出具体操作线索。',
      riskLevel: 'medium',
    }
  }

  if (/怕错|担心|來不及|来不及|紧张|会不会错/.test(normalized)) {
    return {
      emotionLabel: 'anxious',
      valence: -0.36,
      arousal: 0.68,
      confidence: 0.74,
      summary: '学生对完成结果有担心倾向，适合用确认式反馈稳定学习节奏。',
      riskLevel: 'low',
    }
  }

  if (/有意思|我想知道|好奇|为什么会|还能/.test(normalized)) {
    return {
      emotionLabel: 'curious',
      valence: 0.42,
      arousal: 0.58,
      confidence: 0.78,
      summary: '学生主动延伸提问，表现出较好的探究兴趣。',
      riskLevel: 'none',
    }
  }

  if (/我会了|很简单|明白了|懂了|可以/.test(normalized)) {
    return {
      emotionLabel: 'confident',
      valence: 0.48,
      arousal: 0.42,
      confidence: 0.72,
      summary: '学生表达出理解或掌握信号，可以安排迁移练习。',
      riskLevel: 'none',
    }
  }

  if (/无聊|没意思|随便|不想看/.test(normalized)) {
    return {
      emotionLabel: 'bored',
      valence: -0.28,
      arousal: 0.24,
      confidence: 0.68,
      summary: '学生投入感偏低，适合切换到更具体的互动任务。',
      riskLevel: 'low',
    }
  }

  return {
    emotionLabel: 'neutral',
    valence: 0,
    arousal: 0.35,
    confidence: 0.64,
    summary: '学生输入未显示明显情绪波动，可按一般学习支持处理。',
    riskLevel: 'none',
  }
}

function normalizeEmotionResult(value: Partial<EmotionAnalysisResult>, text: string): EmotionAnalysisResult {
  const fallback = localEmotionFallback(text)
  return {
    emotionLabel: emotionLabels.includes(value.emotionLabel as EmotionLabel) ? (value.emotionLabel as EmotionLabel) : fallback.emotionLabel,
    valence: clamp(Number(value.valence ?? fallback.valence), -1, 1),
    arousal: clamp(Number(value.arousal ?? fallback.arousal), 0, 1),
    confidence: clamp(Number(value.confidence ?? fallback.confidence), 0, 1),
    summary: typeof value.summary === 'string' && value.summary.trim() ? value.summary.trim().slice(0, 180) : fallback.summary,
    riskLevel: riskLevels.includes(value.riskLevel as RiskLevel) ? (value.riskLevel as RiskLevel) : fallback.riskLevel,
  }
}

function extractJson(content: string) {
  const start = content.indexOf('{')
  const end = content.lastIndexOf('}')
  return start >= 0 && end > start ? content.slice(start, end + 1) : content
}
