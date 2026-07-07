import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom'
import { CaiLunAgent, type AgentQuizContext } from './components/CaiLunAgent'
import { ProcessDemoPage } from './components/ProcessDemoPage'
import { QuizPage } from './components/QuizPage'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { StudentHomePage } from './pages/student/StudentHomePage'
import { StudentReportPage } from './pages/student/StudentReportPage'
import { StudentVideoPage } from './pages/student/StudentVideoPage'
import { TeacherAgentAnalyticsPage } from './pages/teacher/TeacherAgentAnalyticsPage'
import { TeacherDashboardPage } from './pages/teacher/TeacherDashboardPage'
import { TeacherKnowledgeTagsPage } from './pages/teacher/TeacherKnowledgeTagsPage'
import { TeacherQuestionBankPage } from './pages/teacher/TeacherQuestionBankPage'
import { TeacherStudentDetailPage } from './pages/teacher/TeacherStudentDetailPage'
import { TeacherStudentsPage } from './pages/teacher/TeacherStudentsPage'
import { TeacherVideoAnalyticsPage } from './pages/teacher/TeacherVideoAnalyticsPage'
import { StudentShell } from './routes/StudentRoutes'
import { TeacherShell } from './routes/TeacherRoutes'
import type { UserRole } from './lib/authClient'

const idleAgentContext: AgentQuizContext = {
  isQuizActive: false,
  helpUsed: 0,
  helpLimit: 5,
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

function AppRoutes() {
  const { user } = useAuth()
  const [agentContext, setAgentContext] = useState<AgentQuizContext>(idleAgentContext)
  const resetAgentContext = useCallback(() => setAgentContext(idleAgentContext), [])

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RoleRedirect />} />
        <Route element={<ProtectedRoute role="student" />}>
          <Route path="/student" element={<StudentShell />}>
            <Route index element={<StudentHomePage />} />
            <Route path="video" element={<StudentVideoPage />} />
            <Route path="process" element={<ProcessPage onLeave={resetAgentContext} />} />
            <Route path="quiz" element={<QuizRoute onAgentContextChange={setAgentContext} />} />
            <Route path="report" element={<StudentReportPage />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute role="teacher" />}>
          <Route path="/teacher" element={<TeacherShell />}>
            <Route index element={<Navigate to="/teacher/dashboard" replace />} />
            <Route path="dashboard" element={<TeacherDashboardPage />} />
            <Route path="students" element={<TeacherStudentsPage />} />
            <Route path="students/:studentId" element={<TeacherStudentDetailPage />} />
            <Route path="questions" element={<TeacherQuestionBankPage />} />
            <Route path="knowledge-tags" element={<TeacherKnowledgeTagsPage />} />
            <Route path="video-analytics" element={<TeacherVideoAnalyticsPage />} />
            <Route path="agent-analytics" element={<TeacherAgentAnalyticsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {user?.role === 'student' && <CaiLunAgent quizContext={agentContext} />}
    </>
  )
}

function ProtectedRoute({ role }: { role: UserRole }) {
  const { user, loading } = useAuth()
  if (loading) return <main className="paper-panel app-loading">正在恢复登录状态...</main>
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={user.role === 'teacher' ? '/teacher/dashboard' : '/student'} replace />
  return <Outlet />
}

function RoleRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <main className="paper-panel app-loading">正在加载...</main>
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'teacher' ? '/teacher/dashboard' : '/student'} replace />
}

function QuizRoute({ onAgentContextChange }: { onAgentContextChange: (context: AgentQuizContext) => void }) {
  const navigate = useNavigate()
  return <QuizPage onFinished={() => navigate('/student/report')} onAgentContextChange={onAgentContextChange} />
}

function ProcessPage({ onLeave }: { onLeave: () => void }) {
  useEffect(() => {
    onLeave()
  }, [onLeave])
  return <ProcessDemoPage />
}

export default App
