import rateLimit from 'express-rate-limit'
import type { Request, Response } from 'express'
import { getAgentRateLimitPerMinute } from '../config/env.js'

function jsonLimitHandler(message: string) {
  return (_req: Request, res: Response) => {
    res.status(429).json({ message })
  }
}

export const authLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: jsonLimitHandler('登录尝试过于频繁，请稍后再试。'),
})

export const authRegisterRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: jsonLimitHandler('注册请求过于频繁，请稍后再试。'),
})

export const agentChatRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: getAgentRateLimitPerMinute(),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: jsonLimitHandler('小助手请求过于频繁，请稍后再试。'),
})

export const videoEventBatchRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: jsonLimitHandler('视频行为上报过于频繁，请稍后再试。'),
})
