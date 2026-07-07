import { useCallback, useEffect, useRef, useState } from 'react'
import { knowledgePointMeta, questions } from '../data/questions'
import { apiFetch } from '../lib/apiClient'
import {
  createInitialQuizState,
  generateLearningReport,
  incrementHelpUsed,
  isQuizFinished,
  selectNextQuestion,
  updateQuizStateAfterAnswer,
  type AnswerRecord,
  type QuizState,
} from '../lib/adaptiveQuizEngine'
import {
  clearQuizSession,
  loadCurrentQuestionId,
  loadQuizState,
  saveCurrentQuestionId,
  saveLastReport,
  saveQuizState,
} from '../lib/storage'
import { formatPercent } from '../lib/utils'
import type { AgentQuizContext } from './CaiLunAgent'
import { MasteryChart } from './MasteryChart'
import { QuestionCard } from './QuestionCard'
import { QuizProgress } from './QuizProgress'

type QuizPageProps = {
  onFinished: () => void
  onAgentContextChange: (context: AgentQuizContext) => void
}

function loadActiveQuizState() {
  const stored = loadQuizState()
  if (stored && !isQuizFinished(stored)) return stored
  return createInitialQuizState()
}

function pickCurrentQuestion(state: QuizState) {
  const savedId = loadCurrentQuestionId()
  const savedQuestion = questions.find(
    (question) => question.id === savedId && !state.answeredQuestionIds.includes(question.id),
  )
  return savedQuestion ?? selectNextQuestion(questions, state)
}

export function QuizPage({ onFinished, onAgentContextChange }: QuizPageProps) {
  const [quizState, setQuizState] = useState(loadActiveQuizState)
  const [currentQuestion, setCurrentQuestion] = useState(() => pickCurrentQuestion(quizState))
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [usedHelpForCurrent, setUsedHelpForCurrent] = useState(false)
  const [quizSessionId, setQuizSessionId] = useState<string | null>(null)
  const answerStartedAt = useRef(Date.now())
  const sessionStartedRef = useRef(false)

  useEffect(() => {
    if (sessionStartedRef.current) return
    sessionStartedRef.current = true
    apiFetch<{ session: { id: string } }>('/quiz/session', {
      method: 'POST',
      body: JSON.stringify({ totalQuestions: quizState.totalQuestions }),
    })
      .then((response) => setQuizSessionId(response.session.id))
      .catch(() => setQuizSessionId(null))
  }, [quizState.totalQuestions])

  useEffect(() => {
    saveQuizState(quizState)
  }, [quizState])

  useEffect(() => {
    saveCurrentQuestionId(currentQuestion.id)
    answerStartedAt.current = Date.now()
  }, [currentQuestion.id])

  const requestAgentHint = useCallback(() => {
    if (quizState.helpUsed >= quizState.helpLimit || submitted) return false
    const nextState = incrementHelpUsed(quizState)
    setQuizState(nextState)
    setUsedHelpForCurrent(true)
    return true
  }, [quizState, submitted])

  useEffect(() => {
    onAgentContextChange({
      isQuizActive: true,
      currentQuestion,
      submitted,
      quizSessionId,
      helpUsed: quizState.helpUsed,
      helpLimit: quizState.helpLimit,
      requestHint: requestAgentHint,
    })

    return () => {
      onAgentContextChange({
        isQuizActive: false,
        helpUsed: 0,
        helpLimit: 5,
      })
    }
  }, [
    currentQuestion,
    onAgentContextChange,
    quizState.helpLimit,
    quizState.helpUsed,
    quizSessionId,
    requestAgentHint,
    submitted,
  ])

  function handleSubmit() {
    if (selectedIndex === null || submitted) return
    const correct = selectedIndex === currentQuestion.answerIndex
    const record: AnswerRecord = {
      questionId: currentQuestion.id,
      selectedIndex,
      correct,
      timeSpentMs: Date.now() - answerStartedAt.current,
      usedAgentHelp: usedHelpForCurrent,
      knowledgePoints: currentQuestion.knowledgePoints,
      difficulty: currentQuestion.difficulty,
    }
    const nextState = updateQuizStateAfterAnswer(quizState, currentQuestion, record)
    setQuizState(nextState)
    setSubmitted(true)
    if (quizSessionId) {
      void apiFetch('/quiz/answer', {
        method: 'POST',
        body: JSON.stringify({
          quizSessionId,
          questionId: currentQuestion.id,
          selectedIndex,
          timeSpentMs: record.timeSpentMs,
          usedAgentHelp: record.usedAgentHelp,
          helpUsed: nextState.helpUsed,
          finalAbility: nextState.currentAbility,
        }),
      })
    }
  }

  function handleNext() {
    if (isQuizFinished(quizState)) {
      saveLastReport(generateLearningReport(quizState))
      onFinished()
      return
    }

    const nextQuestion = selectNextQuestion(questions, quizState)
    setCurrentQuestion(nextQuestion)
    setSelectedIndex(null)
    setSubmitted(false)
    setUsedHelpForCurrent(false)
  }

  function restartQuiz() {
    clearQuizSession()
    const fresh = createInitialQuizState()
    const nextQuestion = selectNextQuestion(questions, fresh)
    setQuizState(fresh)
    setCurrentQuestion(nextQuestion)
    setSelectedIndex(null)
    setSubmitted(false)
    setUsedHelpForCurrent(false)
  }

  const weakestPoint = [...currentQuestion.knowledgePoints].sort(
    (left, right) => quizState.masteryByKnowledgePoint[left] - quizState.masteryByKnowledgePoint[right],
  )[0]
  const questionNumber = submitted ? quizState.answeredQuestionIds.length : quizState.answeredQuestionIds.length + 1

  return (
    <section className="quiz-page">
      <div className="section-heading">
        <p className="eyebrow">造纸术交互式学习课程</p>
        <h1>课后测验</h1>
        <p>第 {Math.min(questionNumber, quizState.totalQuestions)} / {quizState.totalQuestions} 题 · 蔡伦提示 {quizState.helpLimit - quizState.helpUsed} / {quizState.helpLimit}</p>
      </div>

      <div className="quiz-layout">
        <div className="quiz-main">
          <QuestionCard
            question={currentQuestion}
            questionNumber={Math.min(questionNumber, quizState.totalQuestions)}
            totalQuestions={quizState.totalQuestions}
            selectedIndex={selectedIndex}
            submitted={submitted}
            onSelect={setSelectedIndex}
            onSubmit={handleSubmit}
            onNext={handleNext}
          />
        </div>
        <div className="quiz-side">
          <QuizProgress state={quizState} />
          <div className="paper-panel mastery-summary">
            <h2>掌握度提示</h2>
            <p>
              当前题关联【{knowledgePointMeta[weakestPoint].label}】，你的掌握度约为{' '}
              {formatPercent(quizState.masteryByKnowledgePoint[weakestPoint])}。
            </p>
            <MasteryChart mastery={quizState.masteryByKnowledgePoint} compact />
            <button className="ghost-button full-width" type="button" onClick={restartQuiz}>
              重新测验
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
