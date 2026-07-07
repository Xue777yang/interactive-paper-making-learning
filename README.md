# 互动式多模态学习平台

一个“学生端 + 教师端 + 后台数据分析”的中文互动学习网站。前端使用 React + TypeScript + Vite，后端使用 Express + Prisma + SQLite。核心功能包括微课视频学习、古代造纸术 8 步互动演示、50 题题库、自适应答题、DeepSeek 代理版“蔡伦小助手”、学习报告和教师端数据看板。

## 运行

```bash
npm install
npm run dev
```

如果本机没有 npm，也可以使用 pnpm：

```bash
pnpm install
pnpm db:generate
pnpm db:seed
pnpm dev
```

Windows/Codex 环境如果遇到 `node is not recognized`、Vite HMR WebSocket 断开，或 `tsx watch` 退出导致页面断线，可以用稳定演示入口：

```powershell
.\scripts\dev-root.ps1
```

该脚本会优先使用 Codex 自带 Node/pnpm，并运行 `pnpm run dev:stable`。

开发服务器默认监听：

- 前端：`http://127.0.0.1:5173/`
- 后端：`http://127.0.0.1:8787/`

演示账号：

- 学生：`student1 / 123456`
- 教师：`teacher1 / 123456`

如果本机 Prisma migrate engine 异常，可直接运行 `pnpm db:seed`，seed 脚本会自动创建 SQLite 表并导入演示数据。

## DeepSeek

后端从 `.env` 读取：

```bash
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
```

前端不会读取 API key。没有配置 key 时，小助手自动降级为本地知识库模式。

## 教学视频

默认视频资源：

```text
public/videos/papermaking-course.mp4
public/videos/papermaking-poster.webp
public/videos/papermaking-course.zh.vtt 可选
```

替换视频时保持文件名不变即可；如果视频时长不同，可在教师端“视频分析”页面调整知识点 marker。

## 主要模块

- `src/data/questions.ts`：50 道造纸术题库，覆盖 10 个知识点。
- `src/lib/adaptiveQuizEngine.ts`：自适应出题、能力值和掌握度更新、学习报告生成。
- `src/lib/learningAnalytics.ts`：本地学习画像、题目质量和模拟班级数据统计。
- `src/components/ProcessDemoPage.tsx`：8 步造纸流程互动演示。
- `src/components/QuizPage.tsx`：课后测验流程。
- `src/components/CaiLunAgent.tsx`：右下角蔡伦小助手，支持有限次数启发式提示。
- `server/src`：Express API、DeepSeek 代理、情绪分析、视频行为分析和教师端聚合。
- `prisma/schema.prisma`、`prisma/seed.ts`：SQLite 数据模型和演示数据。

## 验证

```bash
npm run lint
npm run build
```
