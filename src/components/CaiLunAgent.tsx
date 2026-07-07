import { useEffect, useState } from 'react'
import type { Question } from '../data/questions'
import { buildQuestionHint, buildSubmittedExplanation, findKnowledgeAnswer } from '../data/cailunKnowledgeBase'
import { apiFetch } from '../lib/apiClient'
import cailunChibiUrl from '../assets/agent/cailun-chibi.png'

export type AgentQuizContext = {
  isQuizActive: boolean
  currentQuestion?: Question
  submitted?: boolean
  quizSessionId?: string | null
  helpUsed: number
  helpLimit: number
  requestHint?: () => boolean
}

type CaiLunAgentProps = {
  quizContext: AgentQuizContext
}

type ChatMessage = {
  role: 'agent' | 'user'
  text: string
}

type AssistantMode = 'checking' | 'deepseek' | 'local'

const initialMessages: ChatMessage[] = [
  {
    role: 'agent',
    text: '我是蔡伦小助手，可以帮你梳理造纸流程和关键知识点。',
  },
]

export function CaiLunAgent({ quizContext }: CaiLunAgentProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [assistantMode, setAssistantMode] = useState<AssistantMode>('checking')
  const [avatarReady, setAvatarReady] = useState(Boolean(cailunChibiUrl))
  const [sending, setSending] = useState(false)
  const remainingHelp = Math.max(0, quizContext.helpLimit - quizContext.helpUsed)

  useEffect(() => {
    const openAgent = () => setOpen(true)
    window.addEventListener('open-cailun-agent', openAgent)
    return () => window.removeEventListener('open-cailun-agent', openAgent)
  }, [])

  useEffect(() => {
    apiFetch<{ mode: 'deepseek' | 'local' }>('/agent/status')
      .then((response) => setAssistantMode(response.mode))
      .catch(() => setAssistantMode('local'))
  }, [])

  function addAgentMessage(text: string) {
    setMessages((current) => [...current, { role: 'agent', text }])
  }

  async function requestCurrentHint(prompt = '请给我这道题的启发式提示。') {
    if (!quizContext.currentQuestion) {
      addAgentMessage('现在还没有正在作答的题目。你可以先进入“课后测验”，我会根据当前题给启发式提示。')
      return
    }

    if (quizContext.submitted) {
      await sendToAgent(prompt === '请给我这道题的启发式提示。' ? '请解释这道题的答案。' : prompt)
      return
    }

    if (remainingHelp <= 0) {
      addAgentMessage('本轮答题帮助次数已用完，请尝试独立作答。你仍然可以问我一般的造纸术知识。')
      return
    }

    const used = quizContext.requestHint?.()
    if (!used) {
      addAgentMessage('本轮答题帮助次数已用完，请尝试独立作答。')
      return
    }
    await sendToAgent(prompt)
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text) return
    setInput('')

    const asksCurrentQuestion =
      quizContext.isQuizActive &&
      quizContext.currentQuestion &&
      /这题|当前|答案|提示|选哪个|怎么答|不会|帮我/.test(text)

    if (asksCurrentQuestion) {
      if (quizContext.submitted && quizContext.currentQuestion) {
        await sendToAgent(text)
      } else {
        await requestCurrentHint(text)
      }
      return
    }

    await sendToAgent(text)
  }

  async function sendToAgent(text: string, skipUserEcho = false) {
    if (!skipUserEcho) {
      setMessages((current) => [...current, { role: 'user', text }])
    }
    setSending(true)
    try {
      const currentQuestion = quizContext.currentQuestion
      const response = await apiFetch<{
        conversationId: string
        reply: string
        mode: 'deepseek' | 'local'
      }>('/agent/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          conversationId,
          contextType: quizContext.isQuizActive ? 'quiz' : 'general',
          currentQuestionId: currentQuestion?.id,
          currentQuestionStem: currentQuestion?.stem,
          currentQuestionOptions: currentQuestion?.options,
          questionSubmitted: Boolean(quizContext.submitted),
          quizSessionId: quizContext.quizSessionId,
        }),
      })
      setConversationId(response.conversationId)
      setAssistantMode(response.mode)
      addAgentMessage(response.reply || localFallback(text))
    } catch {
      setAssistantMode('local')
      addAgentMessage(localFallback(text))
    } finally {
      setSending(false)
    }
  }

  function localFallback(text: string) {
    if (quizContext.isQuizActive && quizContext.currentQuestion) {
      return quizContext.submitted
        ? buildSubmittedExplanation(quizContext.currentQuestion)
        : buildQuestionHint(quizContext.currentQuestion)
    }
    return findKnowledgeAnswer(text)
  }

  return (
    <aside className={open ? 'agent-widget open' : 'agent-widget'} aria-label="蔡伦小助手">
      {open && (
        <div className="agent-panel paper-panel">
          <div className="agent-header">
            <CaiLunAvatarImage
              className="agent-header-avatar"
              avatarReady={avatarReady}
              onError={() => setAvatarReady(false)}
            />
            <div>
              <strong>蔡伦小助手</strong>
              <span>
                {getAssistantModeLabel(assistantMode)} · 帮助 {remainingHelp} / {quizContext.helpLimit}
              </span>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="收起蔡伦小助手">
              ×
            </button>
          </div>
          <div className="agent-messages" aria-live="polite">
            {messages.map((message, index) => (
              <p className={message.role === 'agent' ? 'agent-message' : 'user-message'} key={`${message.role}-${index}`}>
                {message.text}
              </p>
            ))}
          </div>
          {quizContext.isQuizActive && (
            <button className="hint-button" type="button" onClick={() => void requestCurrentHint()}>
              {quizContext.submitted ? '解释本题答案' : '请求本题提示'}
            </button>
          )}
          <div className="agent-input-row">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') sendMessage()
              }}
              placeholder={remainingHelp <= 0 && quizContext.isQuizActive ? '可问一般造纸知识，不能再要本题提示' : '问问造纸术知识'}
            />
            <button type="button" onClick={sendMessage}>
              {sending ? '...' : '发送'}
            </button>
          </div>
        </div>
      )}

      <button className="agent-avatar" type="button" onClick={() => setOpen((value) => !value)} aria-label="打开蔡伦小助手">
        <CaiLunAvatarImage avatarReady={avatarReady} onError={() => setAvatarReady(false)} />
      </button>
    </aside>
  )
}

function getAssistantModeLabel(mode: AssistantMode) {
  if (mode === 'checking') return '检测中'
  return mode === 'deepseek' ? 'DeepSeek Flash' : '本地知识库'
}

function CaiLunAvatarImage({
  avatarReady,
  className,
  onError,
}: {
  avatarReady: boolean
  className?: string
  onError: () => void
}) {
  if (avatarReady) {
    return <img className={className} src={cailunChibiUrl} alt="蔡伦小助手" onError={onError} />
  }

  return (
    <svg className={className} viewBox="0 0 120 120" role="img" aria-label="蔡伦头像">
      <circle cx="60" cy="60" r="54" className="avatar-bg" />
      <path d="M32 52c7-24 49-26 57 0 7 23-5 44-29 44S25 75 32 52Z" className="avatar-face" />
      <path d="M35 47c6-19 44-24 52 1-15-4-36-3-52-1Z" className="avatar-hat" />
      <circle cx="47" cy="63" r="4" className="avatar-eye" />
      <circle cx="73" cy="63" r="4" className="avatar-eye" />
      <path d="M49 79c7 6 16 6 23 0" className="avatar-mouth" />
    </svg>
  )
}
