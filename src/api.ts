import type { ApiErrorResponse, DashboardSummary, LoginForm, LoginResponse, User } from './types'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as Partial<ApiErrorResponse>
    return data.message || `Error ${response.status}`
  } catch {
    return `Error ${response.status}`
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  if (!apiBaseUrl) {
    throw new ApiError('Falta configurar VITE_API_BASE_URL en el archivo .env', 0)
  }

  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let response: Response

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers,
    })
  } catch {
    throw new ApiError(
      'No se pudo conectar con la API. Abre el front en http://localhost:5173 y revisa VITE_API_BASE_URL.',
      0,
    )
  }

  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status)
  }

  return response.json() as Promise<T>
}

export function login(payload: LoginForm) {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getCurrentUser(token: string) {
  return request<User>('/auth/me', {}, token)
}

export function getDashboardSummary(token: string) {
  return request<DashboardSummary>('/dashboard/summary', {}, token)
}
