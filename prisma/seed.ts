import { PrismaClient } from '@prisma/client'
import { questions } from '../src/data/questions.ts'
import { hashPassword } from '../server/src/middleware/auth.ts'

const prisma = new PrismaClient()

const tagSeeds = [
  ['origin_history', '纸韵千年', '纸出现前后的书写材料与技术背景。', '#7c3aed'],
  ['cailun_innovation', '蔡伦改进', '蔡伦对原料选择、流程规范和推广的贡献。', '#0f766e'],
  ['raw_materials', '原料选择', '树皮、麻头、破布、旧渔网等植物纤维来源。', '#16a34a'],
  ['preparation', '备料', '采集、清洗、浸泡等前处理。', '#0891b2'],
  ['steaming', '蒸煮', '通过浸泡和蒸煮软化并分离纤维。', '#ea580c'],
  ['pulping', '打浆', '捣碎纤维并形成均匀纸浆。', '#2563eb'],
  ['sheet_forming', '抄纸成形', '用纸帘捞取纤维形成湿纸页。', '#db2777'],
  ['drying', '晒纸干燥', '压榨、晾晒、揭纸等成纸关键环节。', '#ca8a04'],
  ['finishing', '整理裁切', '整理、裁切、保存与纸张使用。', '#64748b'],
  ['environmental_papermaking', '环保造纸', '再生纸、节约用纸与资源循环。', '#059669'],
  ['smart_papermaking', '智能造纸', '现代自动化、传感器与绿色生产。', '#4f46e5'],
  ['culture_impact', '传承与创新', '造纸术传播、印刷、教育和文化影响。', '#c2410c'],
] as const

const demoStudents = [
  ['student-demo-1', 'student1', '张小纸'],
  ['student-demo-2', 'student2', '李青竹'],
  ['student-demo-3', 'student3', '陈墨墨'],
] as const

const questionPointToTagCode: Record<string, string> = {
  origin_history: 'origin_history',
  cailun_innovation: 'cailun_innovation',
  raw_materials: 'raw_materials',
  soaking_cooking: 'steaming',
  pulping: 'pulping',
  sheet_forming: 'sheet_forming',
  pressing_drying: 'drying',
  spread_and_impact: 'culture_impact',
  printing_and_culture: 'culture_impact',
  modern_environment: 'environmental_papermaking',
}

const markerSeeds = [
  ['纸韵千年', 'origin_history', 0, 15, '从竹简、帛书到纸，理解书写材料变迁。'],
  ['蔡伦改进', 'cailun_innovation', 15, 40, '蔡伦改进原料和流程，让纸更适合推广。'],
  ['备料', 'preparation', 60, 90, '选择并整理纤维材料，为后续软化做准备。'],
  ['蒸煮', 'steaming', 90, 130, '加水和加热让纤维软化、分离。'],
  ['打浆', 'pulping', 130, 170, '捣碎纤维，使纸浆分散均匀。'],
  ['抄纸成形', 'sheet_forming', 170, 220, '用纸帘捞取纤维，形成湿纸页。'],
  ['晒纸干燥', 'drying', 220, 260, '压榨去水并晾晒干燥。'],
  ['整理裁切', 'finishing', 260, 300, '揭纸、整理和裁切形成可用纸张。'],
  ['环保与智能造纸', 'environmental_papermaking', 300, 380, '连接再生纸、绿色生产和智能控制。'],
  ['传承与创新', 'culture_impact', 380, 410, '理解造纸术对教育、印刷和文明传播的影响。'],
] as const

async function main() {
  const demoClass = await prisma.class.upsert({
    where: { id: 'class-demo-1' },
    update: { name: '造纸术研学一班', grade: '七年级' },
    create: { id: 'class-demo-1', name: '造纸术研学一班', grade: '七年级' },
  })

  const teacher = await prisma.user.upsert({
    where: { username: 'teacher1' },
    update: {
      displayName: '王老师',
      passwordHash: hashPassword('123456'),
      role: 'teacher',
      classId: demoClass.id,
    },
    create: {
      id: 'teacher-demo-1',
      username: 'teacher1',
      displayName: '王老师',
      passwordHash: hashPassword('123456'),
      role: 'teacher',
      classId: demoClass.id,
    },
  })

  const students = await Promise.all(
    demoStudents.map(([id, username, displayName]) =>
      prisma.user.upsert({
        where: { username },
        update: {
          displayName,
          passwordHash: hashPassword('123456'),
          role: 'student',
          classId: demoClass.id,
        },
        create: {
          id,
          username,
          displayName,
          passwordHash: hashPassword('123456'),
          role: 'student',
          classId: demoClass.id,
        },
      }),
    ),
  )

  const tagByCode = new Map<string, string>()
  for (let index = 0; index < tagSeeds.length; index += 1) {
    const [code, name, description, color] = tagSeeds[index]
    const tag = await prisma.knowledgeTag.upsert({
      where: { code },
      update: {
        name,
        description,
        color,
        orderIndex: index + 1,
        active: true,
      },
      create: {
        id: `tag-${code}`,
        code,
        name,
        description,
        color,
        orderIndex: index + 1,
      },
    })
    tagByCode.set(code, tag.id)
  }

  for (const question of questions) {
    const tagLinks = [
      ...new Set(
        question.knowledgePoints
          .map((point) => tagByCode.get(questionPointToTagCode[point]))
          .filter((id): id is string => Boolean(id)),
      ),
    ].map((knowledgeTagId) => ({ knowledgeTagId }))

    await prisma.question.upsert({
      where: { id: question.id },
      update: {
        stem: question.stem,
        optionA: question.options[0],
        optionB: question.options[1],
        optionC: question.options[2],
        optionD: question.options[3],
        answerIndex: question.answerIndex,
        explanation: question.explanation,
        difficulty: question.difficulty,
        active: true,
        createdById: teacher.id,
        tags: {
          deleteMany: {},
          create: tagLinks,
        },
      },
      create: {
        id: question.id,
        stem: question.stem,
        optionA: question.options[0],
        optionB: question.options[1],
        optionC: question.options[2],
        optionD: question.options[3],
        answerIndex: question.answerIndex,
        explanation: question.explanation,
        difficulty: question.difficulty,
        createdById: teacher.id,
        tags: {
          create: tagLinks,
        },
      },
    })
  }

  const videoAsset = buildVideoAsset()
  const video = await prisma.videoResource.upsert({
    where: { id: 'video-papermaking-course' },
    update: {
      title: '造纸术微课',
      description: '从纸韵千年到智能造纸的课程视频。',
      src: videoAsset.src,
      poster: videoAsset.poster,
      duration: 410,
      active: true,
    },
    create: {
      id: 'video-papermaking-course',
      title: '造纸术微课',
      description: '从纸韵千年到智能造纸的课程视频。',
      src: videoAsset.src,
      poster: videoAsset.poster,
      duration: 410,
    },
  })

  await prisma.videoKnowledgeMarker.deleteMany({ where: { videoId: video.id } })
  for (let index = 0; index < markerSeeds.length; index += 1) {
    const [label, tagCode, startTime, endTime, description] = markerSeeds[index]
    const tag = await prisma.knowledgeTag.findUniqueOrThrow({ where: { code: tagCode } })
    await prisma.videoKnowledgeMarker.create({
      data: {
        id: `marker-papermaking-${index + 1}`,
        videoId: video.id,
        knowledgeTagId: tag.id,
        label,
        startTime,
        endTime,
        color: tag.color,
        description,
        orderIndex: index + 1,
      },
    })
  }

  await seedQuizData(students)
  await seedVideoEvents(students, video.id)
  await seedProcessEvents(students)
  await seedAgentData(students)
}

async function seedQuizData(students: Array<{ id: string }>) {
  const sample = questions.slice(0, 24)
  for (const [studentIndex, student] of students.entries()) {
    const existing = await prisma.quizSession.findFirst({ where: { userId: student.id } })
    if (existing) continue

    const session = await prisma.quizSession.create({
      data: {
        userId: student.id,
        totalQuestions: 20,
        completedAt: new Date(Date.now() - (studentIndex + 1) * 60 * 60 * 1000),
      },
    })
    let correctCount = 0
    let totalTime = 0
    let helpUsed = 0
    for (let index = 0; index < 20; index += 1) {
      const question = sample[(index + studentIndex * 3) % sample.length]
      const probability = studentIndex === 0 ? 0.82 : studentIndex === 1 ? 0.62 : 0.44
      const correct = deterministicNoise(index, studentIndex) < probability
      const usedAgentHelp = !correct && index % 2 === 0
      const timeSpentMs = 22_000 + question.difficulty * 5_000 + studentIndex * 6_000 + Math.round(deterministicNoise(index, 9) * 16_000)
      correctCount += correct ? 1 : 0
      totalTime += timeSpentMs
      helpUsed += usedAgentHelp ? 1 : 0
      await prisma.answerRecord.create({
        data: {
          quizSessionId: session.id,
          userId: student.id,
          questionId: question.id,
          selectedIndex: correct ? question.answerIndex : (question.answerIndex + 1 + studentIndex) % 4,
          correct,
          timeSpentMs,
          usedAgentHelp,
          difficulty: question.difficulty,
          createdAt: new Date(Date.now() - (20 - index) * 4 * 60 * 1000),
        },
      })
    }

    await prisma.quizSession.update({
      where: { id: session.id },
      data: {
        correctCount,
        helpUsed,
        averageTimeMs: totalTime / 20,
        finalAbility: studentIndex === 0 ? 4.1 : studentIndex === 1 ? 3.1 : 2.4,
      },
    })
  }
}

async function seedVideoEvents(students: Array<{ id: string }>, videoId: string) {
  const ranges = [
    [
      [0, 410],
      [170, 220],
    ],
    [
      [0, 180],
      [220, 410],
      [90, 130],
    ],
    [
      [0, 150],
      [170, 230],
      [130, 170],
    ],
  ]

  for (const [studentIndex, student] of students.entries()) {
    const existing = await prisma.videoEvent.findFirst({ where: { userId: student.id, videoId } })
    if (existing) continue

    const now = Date.now() - (studentIndex + 1) * 35 * 60 * 1000
    let createdOffset = 0
    for (const [rangeIndex, [start, end]] of ranges[studentIndex].entries()) {
      await prisma.videoEvent.create({
        data: {
          userId: student.id,
          videoId,
          eventType: rangeIndex === 0 ? 'play' : 'seek',
          videoTime: start,
          fromTime: rangeIndex === 0 ? null : ranges[studentIndex][rangeIndex - 1][1],
          toTime: rangeIndex === 0 ? null : start,
          playbackRate: 1,
          createdAt: new Date(now + createdOffset),
        },
      })
      createdOffset += 1000
      for (let time = start + 5; time <= end; time += 5) {
        await prisma.videoEvent.create({
          data: {
            userId: student.id,
            videoId,
            eventType: 'timeupdate',
            videoTime: time,
            playbackRate: studentIndex === 1 && time > 260 ? 1.25 : 1,
            watchedDeltaMs: 5000,
            createdAt: new Date(now + createdOffset),
          },
        })
        createdOffset += 1000
      }
      await prisma.videoEvent.create({
        data: {
          userId: student.id,
          videoId,
          eventType: end >= 410 ? 'ended' : 'pause',
          videoTime: end,
          playbackRate: 1,
          createdAt: new Date(now + createdOffset),
        },
      })
      createdOffset += 1000
    }
    if (studentIndex > 0) {
      await prisma.videoEvent.create({
        data: {
          userId: student.id,
          videoId,
          eventType: 'replay',
          videoTime: studentIndex === 1 ? 95 : 135,
          fromTime: studentIndex === 1 ? 220 : 230,
          toTime: studentIndex === 1 ? 95 : 135,
          playbackRate: 1,
          createdAt: new Date(now + createdOffset),
        },
      })
    }
  }
}

async function seedProcessEvents(students: Array<{ id: string }>) {
  const stepIds = ['history', 'cai_lun', 'preparation', 'steaming', 'pulping', 'sheet_forming', 'drying', 'finishing', 'future', 'legacy']
  for (const [studentIndex, student] of students.entries()) {
    const existing = await prisma.processEvent.findFirst({ where: { userId: student.id } })
    if (existing) continue

    const completedCount = studentIndex === 0 ? 10 : studentIndex === 1 ? 7 : 5
    for (let index = 0; index < completedCount; index += 1) {
      await prisma.processEvent.create({
        data: {
          userId: student.id,
          stepId: stepIds[index],
          eventType: 'step_completed',
          progress: 100,
          completed: true,
          timeSpentMs: 38_000 + index * 4_500 + studentIndex * 3_000,
          interactionCount: 4 + index,
          knowledgePoints: JSON.stringify([stepIds[index]]),
          metadata: JSON.stringify({ phase: 'seed completed' }),
        },
      })
    }
  }
}

async function seedAgentData(students: Array<{ id: string }>) {
  const prompts = [
    ['为什么竹帘能把纸浆变成纸？', '抄纸时纤维会留在帘面上，水流走后形成湿纸页。', 'curious', 0.4, 0.55, 'none'],
    ['蒸煮和打浆我有点看不懂，哪个先做？', '先浸泡蒸煮软化纤维，再捣碎打浆形成纸浆。', 'confused', -0.22, 0.52, 'low'],
    ['抄纸成形太难了，我总是选错。', '可以先记住：纸帘捞起纤维，形成的是湿纸页。', 'frustrated', -0.42, 0.7, 'medium'],
  ] as const

  for (const [index, student] of students.entries()) {
    const existing = await prisma.agentConversation.findFirst({ where: { userId: student.id } })
    if (existing) continue

    const [userText, assistantText, label, valence, arousal, risk] = prompts[index]
    const conversation = await prisma.agentConversation.create({
      data: {
        userId: student.id,
        contextType: index === 0 ? 'video' : 'quiz',
        questionId: index === 2 ? 'sheet-01' : null,
      },
    })
    const userMessage = await prisma.agentMessage.create({
      data: {
        conversationId: conversation.id,
        userId: student.id,
        role: 'user',
        content: userText,
        relatedQuestionId: index === 2 ? 'sheet-01' : null,
        relatedVideoTime: index === 0 ? 178 : null,
      },
    })
    await prisma.emotionAnalysis.create({
      data: {
        agentMessageId: userMessage.id,
        userId: student.id,
        emotionLabel: label,
        valence,
        arousal,
        confidence: 0.78,
        summary: index === 0 ? '学生对抄纸成形原理表现出好奇。' : index === 1 ? '学生对流程顺序存在困惑。' : '学生在抄纸成形题目上出现挫败信号。',
        riskLevel: risk,
      },
    })
    await prisma.agentMessage.create({
      data: {
        conversationId: conversation.id,
        userId: student.id,
        role: 'assistant',
        content: assistantText,
        relatedQuestionId: index === 2 ? 'sheet-01' : null,
        relatedVideoTime: index === 0 ? 178 : null,
      },
    })
  }
}

function buildVideoAsset() {
  const configured = (process.env.VIDEO_BASE_URL || '/videos').trim().replace(/\/$/, '')
  const isDirectVideoUrl = /\.(mp4|webm|m3u8)(\?.*)?$/i.test(configured)
  return {
    src: isDirectVideoUrl ? configured : `${configured}/papermaking-course.mp4`,
    poster: isDirectVideoUrl ? null : `${configured}/papermaking-poster.webp`,
  }
}

function deterministicNoise(seed: number, salt: number) {
  const x = Math.sin(seed * 13.37 + salt * 47.11) * 10000
  return x - Math.floor(x)
}

main()
  .then(async () => {
    console.log('Seeded paper-making learning MVP data.')
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
