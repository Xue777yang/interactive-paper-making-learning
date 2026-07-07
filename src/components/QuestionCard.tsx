import type { Question } from '../data/questions'
import { knowledgePointMeta } from '../data/questions'

type QuestionCardProps = {
  question: Question
  questionNumber: number
  totalQuestions: number
  selectedIndex: number | null
  submitted: boolean
  onSelect: (index: number) => void
  onSubmit: () => void
  onNext: () => void
}

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedIndex,
  submitted,
  onSelect,
  onSubmit,
  onNext,
}: QuestionCardProps) {
  const correct = submitted && selectedIndex === question.answerIndex

  return (
    <article className="question-card paper-panel">
      <div className="question-topline">
        <span>
          第 {questionNumber} 题 / 共 {totalQuestions} 题
        </span>
        <strong>难度 {question.difficulty}</strong>
      </div>

      <h2>{question.stem}</h2>

      <div className="knowledge-tags">
        {question.knowledgePoints.map((point) => (
          <span key={point}>{knowledgePointMeta[point].label}</span>
        ))}
      </div>

      <div className="option-list" role="radiogroup" aria-label="选项">
        {question.options.map((option, index) => {
          const isSelected = selectedIndex === index
          const isCorrect = submitted && index === question.answerIndex
          const isWrong = submitted && isSelected && index !== question.answerIndex
          const optionLabel = String.fromCharCode(65 + index)

          return (
            <button
              key={option}
              type="button"
              className={`option-button ${isSelected ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
              onClick={() => onSelect(index)}
              disabled={submitted}
              role="radio"
              aria-checked={isSelected}
            >
              <span>{optionLabel}</span>
              <p>{option}</p>
              {isCorrect && <strong>正确答案</strong>}
              {isWrong && <strong>你的选择</strong>}
            </button>
          )
        })}
      </div>

      {submitted && (
        <div className={correct ? 'answer-feedback correct' : 'answer-feedback wrong'}>
          <strong>{correct ? '回答正确' : '回答错误'}</strong>
          <p>
            正确答案：{String.fromCharCode(65 + question.answerIndex)}. {question.options[question.answerIndex]}
          </p>
          <p>{question.explanation}</p>
          <small>考察知识点：{question.knowledgePoints.map((point) => knowledgePointMeta[point].label).join('、')}</small>
        </div>
      )}

      <div className="question-actions">
        {!submitted ? (
          <button className="primary-button" type="button" onClick={onSubmit} disabled={selectedIndex === null}>
            提交答案
          </button>
        ) : (
          <button className="primary-button" type="button" onClick={onNext}>
            下一题
          </button>
        )}
      </div>
    </article>
  )
}
