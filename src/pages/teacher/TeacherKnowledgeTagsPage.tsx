import { FormEvent, useEffect, useState } from 'react'
import { apiFetch } from '../../lib/apiClient'
import type { KnowledgeTagDto } from '../../lib/analyticsTypes'

const emptyTag = {
  id: '',
  code: '',
  name: '',
  description: '',
  color: '#2563eb',
  orderIndex: 0,
  active: true,
}

export function TeacherKnowledgeTagsPage() {
  const [tags, setTags] = useState<KnowledgeTagDto[]>([])
  const [form, setForm] = useState(emptyTag)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [mergeToId, setMergeToId] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    void refresh()
  }, [])

  async function refresh() {
    const response = await apiFetch<{ tags: KnowledgeTagDto[] }>('/knowledge-tags')
    setTags(response.tags)
  }

  function editTag(tag: KnowledgeTagDto) {
    setEditingId(tag.id)
    setForm({
      id: tag.id,
      code: tag.code,
      name: tag.name,
      description: tag.description ?? '',
      color: tag.color,
      orderIndex: tag.orderIndex ?? 0,
      active: tag.active ?? true,
    })
    setMessage('')
  }

  async function submitTag(event: FormEvent) {
    event.preventDefault()
    const body = {
      code: form.code,
      name: form.name,
      description: form.description,
      color: form.color,
      orderIndex: form.orderIndex,
      active: form.active,
    }
    if (editingId) {
      await apiFetch(`/knowledge-tags/${editingId}`, { method: 'PUT', body: JSON.stringify(body) })
      setMessage('知识点标签已更新。')
    } else {
      await apiFetch('/knowledge-tags', { method: 'POST', body: JSON.stringify(body) })
      setMessage('知识点标签已新增。')
    }
    setEditingId(null)
    setForm(emptyTag)
    await refresh()
  }

  async function deleteTag(tag: KnowledgeTagDto) {
    const response = await apiFetch<{ mode: string }>(`/knowledge-tags/${tag.id}`, {
      method: 'DELETE',
      body: JSON.stringify(mergeToId ? { mergeToId } : {}),
    })
    setMessage(response.mode === 'merged' ? '标签已合并并停用原标签。' : response.mode === 'deactivated' ? '标签已停用。' : '标签已删除。')
    setMergeToId('')
    await refresh()
  }

  return (
    <section className="teacher-page">
      <div className="teacher-page-title">
        <div>
          <p className="eyebrow">知识点标签管理</p>
          <h1>题目、视频 marker 和互动演示统一标签</h1>
        </div>
      </div>

      <div className="teacher-grid tag-admin-grid">
        <article className="paper-panel">
          <h2>{editingId ? '编辑标签' : '新增标签'}</h2>
          <form className="editor-form" onSubmit={submitTag}>
            <label>
              标签名称
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </label>
            <label>
              code
              <input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required disabled={Boolean(editingId)} />
            </label>
            <label>
              描述
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </label>
            <div className="form-row">
              <label>
                颜色
                <input type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} />
              </label>
              <label>
                排序
                <input type="number" value={form.orderIndex} onChange={(event) => setForm({ ...form, orderIndex: Number(event.target.value) })} />
              </label>
            </div>
            <label className="checkbox-line">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
              启用标签
            </label>
            <div className="inline-actions">
              <button className="primary-button" type="submit">
                {editingId ? '保存标签' : '新增标签'}
              </button>
              {editingId && (
                <button className="ghost-button" type="button" onClick={() => {
                  setEditingId(null)
                  setForm(emptyTag)
                }}>
                  取消
                </button>
              )}
            </div>
            {message && <p className="form-success">{message}</p>}
          </form>
        </article>

        <article className="paper-panel">
          <h2>标签列表</h2>
          <div className="merge-row">
            <span>删除已使用标签时合并到</span>
            <select value={mergeToId} onChange={(event) => setMergeToId(event.target.value)}>
              <option value="">不合并，仅停用</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>
          <div className="tag-admin-list">
            {tags.map((tag) => (
              <div className="tag-admin-card" key={tag.id}>
                <span className="tag-color-dot" style={{ background: tag.color }} />
                <div>
                  <strong>{tag.name}</strong>
                  <small>{tag.code}</small>
                  <p>{tag.description}</p>
                  <span>
                    题目 {tag._count?.questionTags ?? 0} · 视频片段 {tag._count?.videoMarkers ?? 0} · {tag.active ? '启用' : '停用'}
                  </span>
                </div>
                <div className="inline-actions">
                  <button className="secondary-button" type="button" onClick={() => editTag(tag)}>
                    编辑
                  </button>
                  <button className="ghost-button" type="button" onClick={() => void deleteTag(tag)} disabled={mergeToId === tag.id}>
                    删除/停用
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  )
}
