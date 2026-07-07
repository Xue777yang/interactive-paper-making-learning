export type KnowledgeTagDto = {
  id: string
  code: string
  name: string
  description?: string
  color: string
  active?: boolean
  orderIndex?: number
  _count?: {
    questionTags: number
    videoMarkers: number
  }
}

export type VideoMarkerDto = {
  id: string
  videoId: string
  knowledgeTagId: string
  label: string
  startTime: number
  endTime: number
  color: string
  description: string
  orderIndex: number
  knowledgeTag?: KnowledgeTagDto
}

export type VideoDto = {
  id: string
  title: string
  description: string
  src: string
  poster?: string | null
  duration: number
  markers: VideoMarkerDto[]
}

export type TeacherStudentRow = {
  id: string
  username: string
  displayName: string
  correctRate: number
  videoCompletionRate: number
  processCompletionRate: number
  weakKnowledgePoints: Array<{ id: string; name: string; color: string; mastery: number }>
  agentQuestionCount: number
  lastLearningTime: string | null
  quizCompleted: boolean
}
