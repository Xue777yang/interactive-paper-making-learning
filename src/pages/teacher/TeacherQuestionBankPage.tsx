import { FormEvent, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../lib/apiClient'
import type { KnowledgeTagDto } from '../../lib/analyticsTypes'
import { formatDuration, formatPercent } from '../../lib/utils'

type QuestionDto = {
  id: string
  stem: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  answerIndex: number
  explanation: string
  difficulty: number
  active: boolean
  tags: Array<{ knowledgeTag: KnowledgeTagDto }>
  _count?: { answerRecords: number }
}

type QuestionAnalytics = {
  id: string
  attempts: number
  correctRate: number
  averageTimeMs: number
  optionDistribution: number[]
  flag: string
}

const emptyQuestion = {
  id: '',
  stem: '',
  options: ['', '', '', ''],
  answerIndex: 0,
  explanation: '',
  difficulty: 3,
  active: true,
  tagIds: [] as string[],
}

export function TeacherQuestionBankPage() {
  const [questions, setQuestions] = useState<QuestionDto[]>([])
  const [analytics, setAnalytics] = useState<QuestionAnalytics[]>([])
  const [tags, setTags] = useState<KnowledgeTagDto[]>([])
  const [form, setForm] = useState(emptyQuestion)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    void refresh()
  }, [])

  async function refresh() {
    const [questionResponse, tagResponse, analyticsResponse] = await Promise.all([
      apiFetch<{ questions: QuestionDto[] }>('/questions'),
      apiFetch<{ tags: KnowledgeTagDto[] }>('/knowledge-tags'),
      apiFetch<{ questions: QuestionAnalytics[] }>('/teacher/question-analytics'),
    ])
    setQuestions(questionResponse.questions)
    setTags(tagResponse.tags)
    setAnalytics(analyticsResponse.questions)
  }

  const filteredQuestions = useMemo(
    () =>
      questions.filter((question) => {
        const matchesSearch = !search || question.stem.includes(search)
        const matchesTag = !tagFilter || question.tags.some((tag) => tag.knowledgeTag.id === tagFilter)
        const matchesDifficulty = !difficultyFilter || question.difficulty === Number(difficultyFilter)
        const matchesActive = !activeFilter || question.active === (activeFilter === 'active')
        return matchesSearch && matchesTag && matchesDifficulty && matchesActive
      }),
    [activeFilter, difficultyFilter, questions, search, tagFilter],
  )

  function editQuestion(question: QuestionDto) {
    setEditingId(question.id)
    setForm({
      id: question.id,
      stem: question.stem,
      options: [question.optionA, question.optionB, question.optionC, question.optionD],
      answerIndex: question.answerIndex,
      explanation: question.explanation,
      difficulty: question.difficulty,
      active: question.active,
      tagIds: question.tags.map((tag) => tag.knowledgeTag.id),
    })
    setMessage('')
  }

  async function submitQuestion(event: FormEvent) {
    event.preventDefault()
    const body = {
      id: form.id || undefined,
      stem: form.stem,
      options: form.options,
      answerIndex: form.answerIndex,
      explanation: form.explanation,
      difficulty: form.difficulty,
      active: form.active,
      tagIds: form.tagIds,
    }
    if (editingId) {
      await apiFetch(`/questions/${editingId}`, { method: 'PUT', body: JSON.stringify(body) })
      setMessage('题目已更新。')
    } else {
      await apiFetch('/questions', { method: 'POST', body: JSON.stringify(body) })
      setMessage('题目已新增。')
    }
    setForm(emptyQuestion)
    setEditingId(null)
    await refresh()
  }

  async function deleteQuestion(question: QuestionDto) {
    const response = await apiFetch<{ mode: 'deleted' | 'deactivated' }>(`/questions/${question.id}`, { method: 'DELETE' })
    setMessage(response.mode === 'deactivated' ? '已有学生作答的题目已停用。' : '题目已删除。')
    await refresh()
  }

  function toggleTag(tagId: string) {
    setForm((current) => ({
      ...current,
      tagIds: current.tagIds.includes(tagId) ? current.tagIds.filter((id) => id !== tagId) : [...current.tagIds, tagId],
    }))
  }

  return (
    <section className="teacher-page">
      <div className="teacher-page-title">
        <div>
          <p className="eyebrow">题库管理</p>
          <h1>题目增删改查与质量分析</h1>
        </div>
      </div>

      <div className="teacher-grid question-bank-grid">
        <article className="paper-panel">
          <h2>{editingId ? '编辑题目' : '新增题目'}</h2>
          <form className="editor-form" onSubmit={submitQuestion}>
            <label>
              题目 ID
              <input value={form.id} onChange={(event) => setForm({ ...form, id: event.target.value })} disabled={Boolean(editingId)} placeholder="可留空自动生成" />
            </label>
            <label>
              题干
              <textarea value={form.stem} onChange={(event) => setForm({ ...form, stem: event.target.value })} required />
            </label>
            {form.options.map((option, index) => (
              <label key={index}>
                选项 {String.fromCharCode(65 + index)}
                <input
                  value={option}
                  onChange={(event) => {
                    const options = [...form.options]
                    options[index] = event.target.value
                    setForm({ ...form, options })
                  }}
                  required
                />
              </label>
            ))}
            <div className="form-row">
              <label>
                正确答案
                <select value={form.answerIndex} onChange={(event) => setForm({ ...form, answerIndex: Number(event.target.value) })}>
                  {[0, 1, 2, 3].map((index) => (
                    <option key={index} value={index}>
                      {String.fromCharCode(65 + index)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                难度
                <select value={form.difficulty} onChange={(event) => setForm({ ...form, difficulty: Number(event.target.value) })}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              解析
              <textarea value={form.explanation} onChange={(event) => setForm({ ...form, explanation: event.target.value })} required />
            </label>
            <label className="checkbox-line">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
              启用题目
            </label>
            <div className="tag-checkbox-grid">
              {tags.map((tag) => (
                <label key={tag.id}>
                  <input type="checkbox" checked={form.tagIds.includes(tag.id)} onChange={() => toggleTag(tag.id)} />
                  <span style={{ borderColor: tag.color }}>{tag.name}</span>
                </label>
              ))}
            </div>
            <div className="inline-actions">
              <button className="primary-button" type="submit">
                {editingId ? '保存修改' : '新增题目'}
              </button>
              {editingId && (
                <button className="ghost-button" type="button" onClick={() => {
                  setEditingId(null)
                  setForm(emptyQuestion)
                }}>
                  取消
                </button>
              )}
            </div>
            {message && <p className="form-success">{message}</p>}
          </form>
        </article>

        <article className="paper-panel">
          <h2>题目列表</h2>
          <div className="filter-row">
            <input placeholder="搜索题干" value={search} onChange={(event) => setSearch(event.target.value)} />
            <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
              <option value="">全部知识点</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
            <select value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value)}>
              <option value="">全部难度</option>
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  难度 {value}
                </option>
              ))}
            </select>
            <select value={activeFilter} onChange={(event) => setActiveFilter(event.target.value)}>
              <option value="">全部状态</option>
              <option value="active">启用</option>
              <option value="inactive">停用</option>
            </select>
          </div>
          <p className="muted-note">已有学生作答的题目将被停用而不是彻底删除。</p>
          <div className="question-list">
            {filteredQuestions.map((question) => {
              const stat = analytics.find((item) => item.id === question.id)
              return (
                <div className="question-admin-card" key={question.id}>
                  <div>
                    <strong>{question.stem}</strong>
                    <p>
                      难度 {question.difficulty} · {question.active ? '启用' : '停用'} · 作答 {question._count?.answerRecords ?? stat?.attempts ?? 0} 次
                    </p>
                    <span>
                      正确率 {formatPercent(stat?.correctRate ?? 0)} · 平均耗时 {formatDuration(stat?.averageTimeMs ?? 0)} · {stat?.flag ?? '暂无分析'}
                    </span>
                    <div className="knowledge-tags">
                      {question.tags.map((tag) => (
                        <span key={tag.knowledgeTag.id}>{tag.knowledgeTag.name}</span>
                      ))}
                    </div>
                  </div>
                  <div className="inline-actions">
                    <button className="secondary-button" type="button" onClick={() => editQuestion(question)}>
                      编辑
                    </button>
                    <button className="ghost-button" type="button" onClick={() => void deleteQuestion(question)}>
                      删除/停用
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </article>
      </div>
    </section>
  )
}
