import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, BookOpen, FileText, Home, LogOut, PlaySquare, ScrollText } from 'lucide-react'
import { PageBackground } from '../components/layout/PageBackground'
import type { PageBackgroundVariant } from '../components/layout/PageBackground'
import { useAuth } from '../lib/AuthContext'
import { clearProcessDemoStorage } from '../lib/processStorage'

const navItems = [
  { to: '/student', label: '首页', icon: Home, end: true },
  { to: '/student/video', label: '微课视频', icon: PlaySquare },
  { to: '/student/process', label: '互动演示', icon: ScrollText },
  { to: '/student/quiz', label: '课后测验', icon: BookOpen },
  { to: '/student/report', label: '学习报告', icon: FileText },
]

export function StudentShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const backgroundVariant = getStudentBackgroundVariant(location.pathname)

  return (
    <div className="app-shell">
      <PageBackground variant={backgroundVariant} />
      <header className="topbar role-topbar">
        <NavLink className="brand" to="/student" aria-label="返回学生端首页">
          <span className="brand-mark" aria-hidden="true">
            纸
          </span>
          <span>
            <strong>互动式多模态学习平台</strong>
            <small>{user?.displayName}</small>
          </span>
        </NavLink>
        <nav className="nav-tabs" aria-label="学生端导航">
          {navItems.map((item) => {
            const Icon = item.icon
            if (item.to === '/student/process') {
              return (
                <NavLink
                  key={item.to}
                  to={`/student/process?reset=${Date.now()}`}
                  className={({ isActive }) => (isActive ? 'nav-tab active' : 'nav-tab')}
                  onClick={(event) => {
                    event.preventDefault()
                    clearProcessDemoStorage()
                    navigate(`/student/process?reset=${Date.now()}`)
                  }}
                >
                  <Icon size={16} />
                  {item.label}
                </NavLink>
              )
            }
            return (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'nav-tab active' : 'nav-tab')}>
                <Icon size={16} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
        <button
          className="icon-text-button"
          type="button"
          onClick={() => {
            void logout().then(() => navigate('/login'))
          }}
        >
          <LogOut size={16} />
          退出
        </button>
      </header>
      <main className="page-shell">
        <Outlet />
      </main>
      <BarChart3 className="route-watermark" size={140} aria-hidden="true" />
    </div>
  )
}

function getStudentBackgroundVariant(pathname: string): PageBackgroundVariant {
  if (pathname.includes('/video')) return 'video'
  if (pathname.includes('/quiz')) return 'quiz'
  if (pathname.includes('/report')) return 'report'
  if (pathname.includes('/process')) return 'student'
  return 'home'
}
