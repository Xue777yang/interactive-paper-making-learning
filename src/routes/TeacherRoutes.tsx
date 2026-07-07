import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, BrainCircuit, LibraryBig, ListChecks, LogOut, Tags, Users, Video } from 'lucide-react'
import { PageBackground } from '../components/layout/PageBackground'
import { useAuth } from '../lib/AuthContext'

const navItems = [
  { to: '/teacher/dashboard', label: '总览', icon: BarChart3 },
  { to: '/teacher/students', label: '学生', icon: Users },
  { to: '/teacher/questions', label: '题库', icon: ListChecks },
  { to: '/teacher/knowledge-tags', label: '知识点', icon: Tags },
  { to: '/teacher/video-analytics', label: '视频分析', icon: Video },
  { to: '/teacher/agent-analytics', label: '小助手', icon: BrainCircuit },
]

export function TeacherShell() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="app-shell teacher-shell">
      <PageBackground variant="teacher" />
      <aside className="teacher-sidebar">
        <NavLink className="teacher-brand" to="/teacher/dashboard">
          <span className="brand-mark" aria-hidden="true">
            纸
          </span>
          <span>
            <strong>互动式多模态学习平台</strong>
            <small>教师工作台</small>
          </span>
        </NavLink>
        <nav className="teacher-nav" aria-label="教师端导航">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : '')}>
                <Icon size={18} />
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
          退出登录
        </button>
      </aside>
      <main className="teacher-main">
        <Outlet />
      </main>
      <LibraryBig className="route-watermark teacher" size={160} aria-hidden="true" />
    </div>
  )
}
