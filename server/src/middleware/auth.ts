import type { NextFunction, Request, RequestHandler, Response } from 'express'
import jwt from 'jsonwebtoken'
import { createHash } from 'node:crypto'
import { getJwtSecret } from '../config/env.js'
import { prisma } from '../db.js'

export type UserRole = 'student' | 'teacher'

export type AuthUser = {
  id: string
  username: string
  displayName: string
  role: UserRole
  classId: string | null
}

export type AuthenticatedRequest = Request & {
  user: AuthUser
}

export function hashPassword(password: string) {
  return `sha256$${createHash('sha256').update(`paper-making:${password}`).digest('hex')}`
}

export function verifyPassword(password: string, passwordHash: string) {
  return hashPassword(password) === passwordHash
}

export function signUserToken(user: AuthUser) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      classId: user.classId,
    },
    getJwtSecret(),
    { expiresIn: '7d' },
  )
}

export const authenticate: RequestHandler = async (req, res, next) => {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined

  if (!token) {
    res.status(401).json({ message: '请先登录。' })
    return
  }

  try {
    const payload = jwt.verify(token, getJwtSecret()) as jwt.JwtPayload
    const userId = typeof payload.sub === 'string' ? payload.sub : ''
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, displayName: true, role: true, classId: true },
    })

    if (!user) {
      res.status(401).json({ message: '登录状态已失效，请重新登录。' })
      return
    }

    ;(req as AuthenticatedRequest).user = { ...user, role: user.role as UserRole }
    next()
  } catch {
    res.status(401).json({ message: '登录状态已失效，请重新登录。' })
  }
}

export function requireTeacher(req: Request, res: Response, next: NextFunction) {
  const { user } = req as AuthenticatedRequest
  if (user.role !== 'teacher') {
    res.status(403).json({ message: '只有教师账号可以访问该数据。' })
    return
  }
  next()
}

export function requireStudentOrTeacher(req: Request, res: Response, next: NextFunction) {
  const { user } = req as AuthenticatedRequest
  if (user.role !== 'student' && user.role !== 'teacher') {
    res.status(403).json({ message: '账号角色无效。' })
    return
  }
  next()
}
