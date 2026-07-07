import { FormEvent, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { GraduationCap, UserPlus, UserRoundCheck } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import type { UserRole } from '../lib/authClient'

const demoAccounts: Record<UserRole, { username: string; password: string; label: string }> = {
  student: { username: 'student1', password: '123456', label: '学生账号 student1 / 123456' },
  teacher: { username: 'teacher1', password: '123456', label: '教师账号 teacher1 / 123456' },
}

export function LoginPage() {
  const { user, login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [role, setRole] = useState<UserRole>('student')
  const [username, setUsername] = useState(demoAccounts.student.username)
  const [password, setPassword] = useState(demoAccounts.student.password)
  const [displayName, setDisplayName] = useState('')
  const [registerAccount, setRegisterAccount] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    return <Navigate to={user.role === 'teacher' ? '/teacher/dashboard' : '/student'} replace />
  }

  function chooseRole(nextRole: UserRole) {
    setRole(nextRole)
    setUsername(demoAccounts[nextRole].username)
    setPassword(demoAccounts[nextRole].password)
    setError('')
    setSuccess('')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const nextUser = await login(username.trim(), password, role)
      navigate(nextUser.role === 'teacher' ? '/teacher/dashboard' : '/student', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败。')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRegister(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      if (registerPassword !== confirmPassword) {
        throw new Error('两次输入的密码不一致。')
      }
      if (registerPassword.length < 6) {
        throw new Error('密码至少 6 位。')
      }
      const nextUser = await register({
        displayName: displayName.trim(),
        username: registerAccount.trim(),
        password: registerPassword,
        confirmPassword,
        role: 'student',
      })
      setSuccess('注册成功，正在进入学生端。')
      navigate(nextUser.role === 'teacher' ? '/teacher/dashboard' : '/student', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败。')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-hero">
        <p className="eyebrow">造纸术交互式学习课程</p>
        <h1>互动式多模态学习平台</h1>
        <p>微课视频、互动演示、课后测验和蔡伦小助手统一呈现。</p>
      </section>

      <section className="login-card paper-panel" aria-label="登录注册">
        <div className="auth-mode-switch" role="tablist" aria-label="选择登录或注册">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            登录
          </button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
            注册
          </button>
        </div>
        {mode === 'login' ? (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="role-switch" role="tablist" aria-label="选择登录身份">
              <button type="button" className={role === 'student' ? 'active' : ''} onClick={() => chooseRole('student')}>
                <GraduationCap size={18} />
                学生登录
              </button>
              <button type="button" className={role === 'teacher' ? 'active' : ''} onClick={() => chooseRole('teacher')}>
                <UserRoundCheck size={18} />
                教师登录
              </button>
            </div>
            <label>
              登录账号
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                aria-label="登录账号"
              />
            </label>
            <label>
              密码
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                aria-label="登录密码"
              />
            </label>
            <div className="demo-account">
              <span>{demoAccounts[role].label}</span>
              <button type="button" className="text-button" onClick={() => chooseRole(role)}>
                填入
              </button>
            </div>
            {error && <p className="form-error">{error}</p>}
            {success && <p className="form-success">{success}</p>}
            <button className="primary-button full-width" type="submit" disabled={submitting}>
              {submitting ? '登录中...' : '进入平台'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegister}>
            <div className="register-badge">
              <UserPlus size={18} />
              学生账号注册
            </div>
            <label>
              用户名 / 昵称
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                autoComplete="name"
                aria-label="用户名或昵称"
                placeholder="例如：林小竹"
              />
            </label>
            <label>
              登录账号
              <input
                value={registerAccount}
                onChange={(event) => setRegisterAccount(event.target.value)}
                autoComplete="username"
                aria-label="注册登录账号"
                placeholder="3-32 位字母、数字或下划线"
              />
            </label>
            <label>
              密码
              <input
                value={registerPassword}
                onChange={(event) => setRegisterPassword(event.target.value)}
                type="password"
                autoComplete="new-password"
                aria-label="注册密码"
              />
            </label>
            <label>
              确认密码
              <input
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                autoComplete="new-password"
                aria-label="确认密码"
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            {success && <p className="form-success">{success}</p>}
            <button className="primary-button full-width" type="submit" disabled={submitting}>
              {submitting ? '注册中...' : '注册并进入学生端'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}
