import { AUTH_USER_STORAGE_KEY, apiFetch, setAuthToken } from './apiClient'

export type UserRole = 'student' | 'teacher'

export type AuthUser = {
  id: string
  username: string
  displayName: string
  role: UserRole
  classId: string | null
}

export function getStoredUser() {
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY)
  try {
    const raw = window.sessionStorage.getItem(AUTH_USER_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export function setStoredUser(user: AuthUser | null) {
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY)
  if (user) {
    window.sessionStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user))
  } else {
    window.sessionStorage.removeItem(AUTH_USER_STORAGE_KEY)
  }
}

export async function login(username: string, password: string, role?: UserRole) {
  const response = await apiFetch<{ token: string; user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, account: username, password, role }),
  })
  setAuthToken(response.token)
  setStoredUser(response.user)
  return response.user
}

export type RegisterPayload = {
  displayName: string
  username: string
  password: string
  confirmPassword: string
  role?: UserRole
  teacherInviteCode?: string
}

export async function register(payload: RegisterPayload) {
  const response = await apiFetch<{ token: string; user: AuthUser }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...payload, account: payload.username }),
  })
  setAuthToken(response.token)
  setStoredUser(response.user)
  return response.user
}

export async function logout() {
  await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined)
  setAuthToken(null)
  setStoredUser(null)
}

export async function fetchCurrentUser() {
  const response = await apiFetch<{ user: AuthUser }>('/auth/me')
  setStoredUser(response.user)
  return response.user
}
