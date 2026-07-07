import type { KnowledgePoint, Question } from './questions'
import { knowledgePointMeta } from './questions'

export type KnowledgeEntry = {
  id: string
  title: string
  keywords: string[]
  relatedPoints: KnowledgePoint[]
  answer: string
}

export const cailunKnowledgeBase: KnowledgeEntry[] = [
  {
    id: 'who-is-cailun',
    title: '蔡伦简介',
    keywords: ['蔡伦', '谁', '人物', '东汉', '改进'],
    relatedPoints: ['cailun_innovation'],
    answer:
      '蔡伦是东汉时期的重要工匠和官员，常被认为系统总结并改进了造纸术。他的贡献不只是“发明一张纸”，更重要的是改良原料、整理流程，让纸更便宜、更稳定、更容易推广。',
  },
  {
    id: 'process',
    title: '古法造纸流程',
    keywords: ['流程', '步骤', '过程', '顺序', '怎么造'],
    relatedPoints: [
      'raw_materials',
      'soaking_cooking',
      'pulping',
      'sheet_forming',
      'pressing_drying',
    ],
    answer:
      '古法造纸可以概括为：采集纤维原料、浸泡蒸煮、捣碎打浆、调浆入槽、抄纸成形、压榨去水、晾晒干燥，最后得到可以书写和传播知识的纸张。',
  },
  {
    id: 'materials',
    title: '造纸原料',
    keywords: ['原料', '树皮', '麻头', '破布', '旧渔网', '纤维'],
    relatedPoints: ['raw_materials'],
    answer:
      '古代造纸常用树皮、麻头、破布、旧渔网等材料，因为它们能提供植物纤维。纤维经过软化、打浆和成形后，会互相交织，形成纸页。',
  },
  {
    id: 'pulping',
    title: '纸浆与打浆',
    keywords: ['纸浆', '打浆', '捣碎', '木槌', '纤维分散'],
    relatedPoints: ['pulping'],
    answer:
      '打浆是把软化后的原料反复捶打，让纤维分散成浆。纸浆越均匀，后续抄出的纸页通常越平整、厚薄越稳定。',
  },
  {
    id: 'sheet-forming',
    title: '抄纸',
    keywords: ['抄纸', '纸帘', '竹帘', '成形', '湿纸'],
    relatedPoints: ['sheet_forming'],
    answer:
      '抄纸是用竹帘或纸帘从浆水中捞取纤维。纤维留在帘面上形成薄薄的湿纸页，这一步决定了纸页的厚薄、均匀度和初步形态。',
  },
  {
    id: 'drying',
    title: '压榨干燥',
    keywords: ['压榨', '干燥', '晾晒', '去水', '揭纸'],
    relatedPoints: ['pressing_drying'],
    answer:
      '湿纸页形成后还含有大量水分，需要压榨去水，再贴墙或平铺晾晒。干燥充分后才能揭下，成为更便于书写和保存的纸。',
  },
  {
    id: 'impact',
    title: '传播与影响',
    keywords: ['传播', '影响', '文化', '教育', '世界', '交流'],
    relatedPoints: ['spread_and_impact', 'printing_and_culture'],
    answer:
      '造纸术降低了记录和复制知识的成本，推动书写、教育、典籍保存和跨地区文化交流。纸也为后来的印刷传播提供了重要载体。',
  },
  {
    id: 'environment',
    title: '环保造纸',
    keywords: ['环保', '再生纸', '节约', '可持续', '回收'],
    relatedPoints: ['modern_environment'],
    answer:
      '现代造纸需要关注资源和环境。节约用纸、双面打印、分类回收、使用再生纸，都是把纤维资源循环利用和减少浪费的做法。',
  },
]

export function findKnowledgeAnswer(input: string) {
  const text = input.trim().toLowerCase()
  if (!text) {
    return '可以问我蔡伦是谁、纸浆怎么形成、抄纸是什么，或造纸术为什么影响文化传播。'
  }

  const scored = cailunKnowledgeBase
    .map((entry) => ({
      entry,
      score: entry.keywords.reduce((sum, keyword) => (text.includes(keyword.toLowerCase()) ? sum + 1 : sum), 0),
    }))
    .sort((a, b) => b.score - a.score)

  if (scored[0]?.score > 0) {
    return scored[0].entry.answer
  }

  return '这个问题好像偏离了造纸术主题。我可以继续帮你理解蔡伦、古法造纸流程、纸的传播影响，或现代环保造纸。'
}

export function buildQuestionHint(question: Question) {
  const primaryPoint = question.knowledgePoints[0]
  const meta = knowledgePointMeta[primaryPoint]
  const concept = meta?.description ?? '先抓住题目考察的核心概念'
  const tags = question.tags?.length ? `这题更像是“${question.tags.join('、')}”类型。` : ''

  return `这题考察【${meta.label}】。${concept}${tags}先判断题干问的是“材料、流程、作用”中的哪一类，再排除和造纸流程明显无关的选项。我不会直接告诉你选项，但你可以回想互动演示第 ${meta.reviewStep ?? 1} 步。`
}

export function buildSubmittedExplanation(question: Question) {
  const correct = question.options[question.answerIndex]
  return `这题的正确答案是“${correct}”。${question.explanation}`
}
