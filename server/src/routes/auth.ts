import { Router } from 'express'
import { isPublicRegistrationEnabled, isTeacherRegistrationEnabled } from '../config/env.js'
import { prisma } from '../db.js'
import {
  authenticate,
  hashPassword,
  signUserToken,
  verifyPassword,
  type AuthenticatedRequest,
  type UserRole,
} from '../middleware/auth.js'
import { asyncHandler } from '../utils.js'

export const authRouter = Router()

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { username, account, password, role } = req.body as {
      username?: string
      account?: string
      password?: string
      role?: string
    }
    const loginAccount = normalizeAccount(username ?? account)
    if (!loginAccount || !password) {
      res.status(400).json({ message: '请输入账号和密码。' })
      return
    }

    const user = await prisma.user.findUnique({ where: { username: loginAccount } })
    if (!user || !verifyPassword(password, user.passwordHash) || (role && role !== user.role)) {
      res.status(401).json({ message: '账号、密码或身份不正确。' })
      return
    }

    if (user.role !== 'student' && user.role !== 'teacher') {
      res.status(401).json({ message: '账号角色无效。' })
      return
    }

    const authUser = toAuthUser(user)
    res.json({ token: signUserToken(authUser), user: authUser })
  }),
)

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { username, account, displayName, password, confirmPassword, role, teacherInviteCode } = req.body as {
      username?: string
      account?: string
      displayName?: string
      password?: string
      confirmPassword?: string
      role?: string
      teacherInviteCode?: string
    }

    const registerAccount = normalizeAccount(username ?? account)
    const nextDisplayName = String(displayName ?? '').trim()
    const nextPassword = String(password ?? '')
    const nextRole = role === 'teacher' ? 'teacher' : 'student'

    if (!isPublicRegistrationEnabled()) {
      res.status(403).json({ message: '当前暂未开放公开注册，请联系教师开通账号。' })
      return
    }

    if (!nextDisplayName || !registerAccount || !nextPassword || !confirmPassword) {
      res.status(400).json({ message: '请完整填写昵称、账号和密码。' })
      return
    }
    if (!/^[A-Za-z0-9_-]{3,32}$/.test(registerAccount)) {
      res.status(400).json({ message: '账号需为 3-32 位字母、数字、下划线或短横线。' })
      return
    }
    if (nextPassword.length < 6) {
      res.status(400).json({ message: '密码至少 6 位。' })
      return
    }
    if (nextPassword !== confirmPassword) {
      res.status(400).json({ message: '两次输入的密码不一致。' })
      return
    }
    if (nextRole === 'teacher') {
      if (!isTeacherRegistrationEnabled()) {
        res.status(403).json({ message: '教师注册暂未开放，请使用 seed 教师账号或联系管理员。' })
        return
      }
      const inviteCode = process.env.TEACHER_INVITE_CODE
      if (!inviteCode || teacherInviteCode !== inviteCode) {
        res.status(403).json({ message: '教师邀请码不正确。' })
        return
      }
    }

    const existing = await prisma.user.findUnique({ where: { username: registerAccount } })
    if (existing) {
      res.status(409).json({ message: '账号已存在。' })
      return
    }

    const defaultClass = await prisma.class.findFirst({ orderBy: { createdAt: 'asc' } })
    const user = await prisma.user.create({
      data: {
        username: registerAccount,
        displayName: nextDisplayName.slice(0, 32),
        passwordHash: hashPassword(nextPassword),
        role: nextRole,
        classId: defaultClass?.id ?? null,
      },
    })

    const authUser = toAuthUser(user)
    res.status(201).json({ token: signUserToken(authUser), user: authUser })
  }),
)

authRouter.post('/logout', (_req, res) => {
  res.json({ ok: true })
})

authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const { user } = req as AuthenticatedRequest
    res.json({ user })
  }),
)

function normalizeAccount(value: string | undefined) {
  return String(value ?? '').trim().toLowerCase()
}

function toAuthUser(user: {
  id: string
  username: string
  displayName: string
  role: string
  classId: string | null
}) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role as UserRole,
    classId: user.classId,
  }
}
