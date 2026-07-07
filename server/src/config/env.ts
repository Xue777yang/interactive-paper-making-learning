const LOCAL_CLIENT_ORIGINS = ['http://127.0.0.1:5173', 'http://localhost:5173']

export type ServerConfig = {
  isProduction: boolean
  port: number
  host: string
  allowedOrigins: string[]
}

export function getServerConfig(): ServerConfig {
  const isProduction = process.env.NODE_ENV === 'production'
  const port = toPositiveInt(process.env.PORT ?? process.env.SERVER_PORT, 8787)
  const configuredOrigins = parseList(process.env.CLIENT_ORIGIN)
  const allowedOrigins = isProduction
    ? configuredOrigins
    : unique([...configuredOrigins, ...LOCAL_CLIENT_ORIGINS])

  return {
    isProduction,
    port,
    host: '0.0.0.0',
    allowedOrigins,
  }
}

export function validateRuntimeEnv(config = getServerConfig()) {
  const missing: string[] = []
  if (!process.env.DATABASE_URL?.trim()) missing.push('DATABASE_URL')
  if (config.isProduction && !process.env.DIRECT_URL?.trim()) missing.push('DIRECT_URL')
  if (!process.env.JWT_SECRET?.trim()) missing.push('JWT_SECRET')
  if (config.isProduction && !config.allowedOrigins.length) missing.push('CLIENT_ORIGIN')

  if (missing.length) {
    throw new Error(`缺少必要环境变量：${missing.join(', ')}。请在 Render/Supabase 配置后重新启动服务。`)
  }

  if (config.isProduction && process.env.DATABASE_URL?.trim().startsWith('file:')) {
    throw new Error('生产环境 DATABASE_URL 不能使用 SQLite file: 连接串，请填写 Supabase PostgreSQL 连接串。')
  }

  if (config.isProduction && config.allowedOrigins.some((origin) => origin === '*')) {
    throw new Error('生产环境 CLIENT_ORIGIN 不能使用 *，请填写 Vercel 前端域名，可用逗号分隔多个域名。')
  }
}

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim()
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('缺少 JWT_SECRET，无法签发或校验登录令牌。')
  }
  return 'paper-making-local-dev-secret'
}

export function isPublicRegistrationEnabled() {
  return process.env.PUBLIC_REGISTRATION_ENABLED !== 'false'
}

export function isTeacherRegistrationEnabled() {
  return process.env.ALLOW_TEACHER_REGISTRATION === 'true'
}

export function getAgentDailyLimitPerUser() {
  return toPositiveInt(process.env.AGENT_DAILY_LIMIT_PER_USER, 50)
}

export function getAgentRateLimitPerMinute() {
  return toPositiveInt(process.env.AGENT_RATE_LIMIT_PER_MINUTE, 10)
}

function parseList(value: string | undefined) {
  return unique(
    String(value ?? '')
      .split(',')
      .map((item) => item.trim().replace(/\/$/, ''))
      .filter(Boolean),
  )
}

function unique<T>(items: T[]) {
  return [...new Set(items)]
}

function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}
