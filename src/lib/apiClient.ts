const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
export const AUTH_TOKEN_STORAGE_KEY = 'paper_making_auth_token'
export const AUTH_USER_STORAGE_KEY = 'paper_making_auth_user'
export const AUTH_EXPIRED_EVENT = 'paper-making-auth-expired'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function getAuthToken() {
  return window.sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
}

export function setAuthToken(token: string | null) {
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
  if (token) {
    window.sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
  } else {
    window.sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken()
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    })
  } catch {
    throw new ApiError(0, '网络连接失败，请检查后端地址或 CORS 配置。')
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: '请求失败。' }))
    if (response.status === 401 && token) {
      setAuthToken(null)
      window.sessionStorage.removeItem(AUTH_USER_STORAGE_KEY)
      window.localStorage.removeItem(AUTH_USER_STORAGE_KEY)
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
    }
    throw new ApiError(response.status, String(payload.message ?? '请求失败。'))
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`
}
