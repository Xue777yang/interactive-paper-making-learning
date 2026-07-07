import type { PageKey } from './Layout'

type HomePageProps = {
  onNavigate: (page: PageKey) => void
}

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <section className="home-grid">
      <div className="hero-panel paper-panel">
        <p className="eyebrow">古代科技 · 互动学习</p>
        <h1>互动式多模态学习平台</h1>
        <p className="hero-copy">通过互动演示、课后测验和蔡伦数字人学习中国古代造纸术。</p>
        <div className="hero-actions">
          <button className="primary-button" type="button" onClick={() => onNavigate('process')}>
            开始互动演示
          </button>
          <button className="secondary-button" type="button" onClick={() => onNavigate('quiz')}>
            开始课后测验
          </button>
          <button className="ghost-button" type="button" onClick={() => onNavigate('report')}>
            查看学习报告
          </button>
        </div>
      </div>

      <div className="ink-stage" aria-label="造纸术流程插画">
        <div className="sun-disc" />
        <div className="bamboo-roll">
          <span />
          <span />
          <span />
        </div>
        <div className="paper-sheet floating-paper">
          <strong>蔡侯纸</strong>
          <p>纤维成浆，抄帘成纸。</p>
        </div>
        <div className="water-tray">
          <i />
          <i />
          <i />
        </div>
      </div>

      <div className="feature-strip">
        <article>
          <span>01</span>
          <h2>8 步流程演示</h2>
          <p>从原料采集到成纸应用，每一步都有可操作的小游戏和学习记录。</p>
        </article>
        <article>
          <span>02</span>
          <h2>课后测验</h2>
          <p>题目会根据正确率、耗时、知识点掌握度和帮助使用情况动态调整。</p>
        </article>
        <article>
          <span>03</span>
          <h2>蔡伦小助手</h2>
          <p>右下角数字人提供启发式提示，答题中不会直接泄露答案。</p>
        </article>
      </div>
    </section>
  )
}
