# 《互动式多模态学习平台》最快真实多用户公网部署手册

本文档对应当前根目录项目结构：前端 `src/ + vite.config.ts`，后端 `server/src/index.ts`，Prisma 位于 `prisma/`，根目录单 `package.json` 管理全部脚本。目标是最快上线真实多用户平台，不做 Docker、Kubernetes、复杂 CI/CD 或对象存储 SDK 集成。

## 1. 最快部署架构

- GitHub：托管当前根目录代码。
- Supabase PostgreSQL：生产数据库。
- Render Web Service：部署 Node.js / Express 后端。
- Vercel：部署 React / Vite 前端。
- DeepSeek API：只由 Render 后端代理调用，前端只请求 `/api/agent/chat`。
- 视频资源：小于 100MB 可临时放 `public/videos`；超过 100MB 请用外部视频 URL，并写入 `VIDEO_BASE_URL` 或 `VideoResource.src`。

## 2. 第一步：推送 GitHub

当前目录就是要推送的项目根目录：`D:\summercamp`。

```bash
git init
git add .
git commit -m "prepare fast public deployment"
git remote add origin https://github.com/<你的账号>/<你的仓库>.git
git branch -M main
git push -u origin main
```

注意：本项目已经忽略 `.env*` 和大型视频格式。当前本地 `public/videos/papermaking-course.mp4` 如果超过 100MB，不要强行提交到 GitHub；请压缩到 100MB 以下，或上传到外部可访问地址。

## 3. 第二步：创建 Supabase PostgreSQL

1. 进入 Supabase，创建新项目。
2. 在 Project Settings / Database 中找到 PostgreSQL connection string。
3. Render 后端至少填写：
   - `DATABASE_URL`
   - `DIRECT_URL`
4. 如果 Supabase 提供 pooled connection 和 direct connection，建议：
   - `DATABASE_URL` 使用 transaction pooler 连接串。
   - `DIRECT_URL` 使用 direct connection 连接串。
5. 如果一开始只拿到一个连接串，可以最快先把 `DATABASE_URL` 和 `DIRECT_URL` 填同一个，后续再优化。

Prisma schema 已使用：

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## 4. 第三步：Render 部署后端

Render 页面操作：

1. New Web Service。
2. 连接 GitHub 仓库。
3. Root Directory 填：`.`。
4. Environment 选择：Node。
5. Build Command：

```bash
corepack enable && pnpm install --frozen-lockfile && pnpm db:generate && pnpm build:server
```

6. Start Command：

```bash
pnpm start:server
```

7. Health Check Path：

```text
/api/health
```

8. 后端环境变量：

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=<Supabase pooled 或普通 PostgreSQL 连接串>
DIRECT_URL=<Supabase direct PostgreSQL 连接串>
CLIENT_ORIGIN=https://你的-vercel-前端域名.vercel.app
JWT_SECRET=<长随机字符串>
SESSION_SECRET=<长随机字符串，当前未使用 cookie session 但可先保留>
DEEPSEEK_API_KEY=<可先不填>
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
PUBLIC_REGISTRATION_ENABLED=true
ALLOW_TEACHER_REGISTRATION=false
TEACHER_INVITE_CODE=
VIDEO_BASE_URL=/videos
AGENT_DAILY_LIMIT_PER_USER=50
AGENT_RATE_LIMIT_PER_MINUTE=10
```

部署完成后测试：

```text
https://你的-render-api.onrender.com/api/health
```

成功示例：

```json
{
  "status": "ok",
  "time": "2026-07-07T00:00:00.000Z",
  "database": "ok"
}
```

## 5. 第四步：数据库迁移和 seed

最快方案 A：Render Shell 执行：

```bash
pnpm db:deploy
pnpm db:seed
```

等价命令：

```bash
npx prisma migrate deploy
npx prisma db seed
```

最快方案 B：本地连接 Supabase 执行。

macOS / Linux：

```bash
DATABASE_URL="你的连接串" DIRECT_URL="你的连接串" npx prisma migrate deploy
DATABASE_URL="你的连接串" DIRECT_URL="你的连接串" npx prisma db seed
```

Windows PowerShell：

```powershell
$env:DATABASE_URL="你的连接串"
$env:DIRECT_URL="你的连接串"
npx prisma migrate deploy
npx prisma db seed
```

Seed 会幂等创建：

- `teacher1 / 123456`
- `student1 / 123456`
- `student2 / 123456`
- `student3 / 123456`
- 默认知识点标签
- 默认题库
- 默认视频资源
- 默认视频 markers

Seed 不会清空真实用户数据；示例答题、视频、互动演示、小助手记录只会给 demo 用户补一次。

## 6. 第五步：Vercel 部署前端

Vercel 页面操作：

1. New Project。
2. 连接同一个 GitHub 仓库。
3. Root Directory 填：`.`。
4. Framework Preset 选择：Vite。
5. Build Command：

```bash
npm run build:client
```

6. Output Directory：

```text
dist
```

7. 前端环境变量：

```env
VITE_API_BASE_URL=https://你的-render-api.onrender.com/api
VITE_VIDEO_BASE_URL=/videos
VITE_DEPLOY_TARGET=vercel
```

不要在 Vercel 添加 `DATABASE_URL`、`DIRECT_URL`、`JWT_SECRET`、`DEEPSEEK_API_KEY`。这些只能放 Render 后端。

本项目已新增 `vercel.json`，刷新 React Router 路由不会 404。

## 7. 第六步：配置 CORS

Vercel 部署成功后，将前端公网地址填入 Render：

```env
CLIENT_ORIGIN=https://你的-vercel-前端域名.vercel.app
```

如果有多个前端域名，用逗号分隔：

```env
CLIENT_ORIGIN=https://a.vercel.app,https://b.vercel.app
```

保存后重新部署后端，再测试前端登录。生产环境不要把 `CLIENT_ORIGIN` 写成 `*`。

## 8. 第七步：配置 DeepSeek

Render 后端添加：

```env
DEEPSEEK_API_KEY=<你的 DeepSeek API Key>
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
```

重新部署后端，打开“蔡伦小助手”测试。若不填写 `DEEPSEEK_API_KEY`，系统会自动使用本地规则 fallback，网站仍可运行。

## 9. 第八步：视频资源最快接入

方案 A：视频小于 100MB。

1. 放入：
   - `public/videos/papermaking-course.mp4`
   - `public/videos/papermaking-poster.webp` 可选
   - `public/videos/papermaking-course.zh.vtt` 可选
2. 如需提交小视频，可临时取消 `.gitignore` 对该视频的忽略，或使用 `git add -f public/videos/papermaking-course.mp4`。
3. `VIDEO_BASE_URL=/videos`。

方案 B：视频超过 100MB。

1. 不要强行提交到 GitHub。
2. 上传到外部可公网访问地址。
3. Render 设置：

```env
VIDEO_BASE_URL=https://你的外部视频目录
```

或在数据库 `VideoResource.src` 中写完整视频 URL。

视频页在资源缺失或加载失败时会显示“视频资源暂未配置”，其他功能不会崩溃。

## 10. 真实多用户数据隔离

- 注册写入 PostgreSQL，默认 `role=student`。
- 登录从 PostgreSQL 校验，密码以 hash 存储。
- 前端保存 Bearer Token，刷新页面后继续识别当前用户。
- 学生答题记录按 `userId` 写入 `AnswerRecord` / `QuizSession`。
- 视频行为按 `userId` 写入 `VideoEvent`。
- 互动演示按 `userId` 写入 `ProcessEvent`。
- 小助手对话和情绪分析按 `userId` 写入 `AgentConversation` / `AgentMessage` / `EmotionAnalysis`。
- 学生报告只查询自己的数据。
- 教师端接口需要 teacher token，可以查看班级/全体学生聚合数据。
- 教师公开注册默认关闭，保留 seed 教师账号 `teacher1 / 123456`。

## 11. 上线验收清单

- 打开 `https://你的-render-api.onrender.com/api/health`，数据库为 `ok`。
- Vercel 前端可打开首页。
- 注册一个新学生。
- 新学生登录成功。
- 刷新页面后仍保持登录。
- 打开微课视频；如果视频未配置，应看到“视频资源暂未配置”。
- 视频可播放时，播放、暂停、跳转可以上报行为。
- 完成互动演示。
- 完成课后测验。
- 查看学习报告。
- 打开蔡伦小助手；无 DeepSeek key 时应走本地 fallback。
- 使用 `teacher1 / 123456` 登录教师端。
- 查看学生列表，新注册学生应出现。
- 查看教师端数据看板。
- 查看题库管理。
- 查看知识点管理。

## 12. 常见问题

- 前端请求失败：检查 Vercel 的 `VITE_API_BASE_URL` 是否为 `https://你的-render-api.onrender.com/api`。
- CORS 报错：检查 Render 的 `CLIENT_ORIGIN` 是否完全等于 Vercel 前端域名。
- 数据库连接失败：检查 `DATABASE_URL` / `DIRECT_URL`，生产环境不要使用 `file:` SQLite。
- Prisma migrate 失败：检查 Supabase 连接串、密码转义、schema 是否为 PostgreSQL。
- Seed 失败：先确认已执行 `pnpm db:generate` 和 `pnpm db:deploy`。
- 小助手失败：检查 `DEEPSEEK_API_KEY`；不填 key 时应自动 fallback。
- 视频打不开：检查 `public/videos` 是否随前端部署，或 `VideoResource.src` 是否为公网可访问 URL。
- 登录后刷新丢失：检查前端 localStorage 是否被浏览器隐私设置清理，检查 token 是否过期。
- 教师端看不到新学生：确认新用户 `role=student`，并且 teacher 账号有权限访问教师端。

## 13. 本项目可用脚本

```bash
npm run dev
npm run build
npm run build:client
npm run build:server
npm run start:server
npm run start:prod
npm run db:generate
npm run db:migrate
npm run db:deploy
npm run db:seed
npm run typecheck
```

Render 使用 `build:server` + `start:server`。Vercel 使用 `build:client`。本地开发继续使用 `npm run dev`。
