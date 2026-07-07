import type { ReactNode } from 'react'

export type PageKey = 'home' | 'process' | 'quiz' | 'report'

type LayoutProps = {
  currentPage: PageKey
  onNavigate: (page: PageKey) => void
  children: ReactNode
}

const navItems: { page: PageKey; label: string }[] = [
  { page: 'home', label: '首页' },
  { page: 'process', label: '互动演示' },
  { page: 'quiz', label: '课后测验' },
  { page: 'report', label: '学习报告' },
]

export function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => onNavigate('home')} aria-label="返回首页">
          <span className="brand-mark" aria-hidden="true">
            纸
          </span>
          <span>
            <strong>互动式多模态学习平台</strong>
            <small>造纸术交互式学习课程</small>
          </span>
        </button>
        <nav className="nav-tabs" aria-label="主导航">
          {navItems.map((item) => (
            <button
              key={item.page}
              type="button"
              className={currentPage === item.page ? 'nav-tab active' : 'nav-tab'}
              onClick={() => onNavigate(item.page)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="page-shell">{children}</main>
    </div>
  )
}
