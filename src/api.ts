import type {
  ApiErrorResponse,
  DashboardSummary,
  LoginForm,
  LoginResponse,
  MutableSignalStatus,
  PaginatedTropels,
  SectorsResponse,
  SectorStory,
  Signal,
  SignalFeedFilters,
  SignalFeedResponse,
  TropelFilters,
  User,
} from './types'

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
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err
    }

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

export function getSectors(token: string, signal?: AbortSignal) {
  return request<SectorsResponse>('/sectors', { signal }, token)
}

export function getSectorStory(token: string, id: string, signal?: AbortSignal) {
  return request<SectorStory>(`/sectors/${id}/story`, { signal }, token)
}

export function getTropels(token: string, filters: TropelFilters, signal?: AbortSignal) {
  const params = new URLSearchParams()
  params.set('page', String(filters.page))
  params.set('size', String(filters.size))
  params.set('sort', filters.sort)

  if (filters.species) params.set('species', filters.species)
  if (filters.vitalState) params.set('vitalState', filters.vitalState)
  if (filters.sectorId) params.set('sectorId', filters.sectorId)
  if (filters.q) params.set('q', filters.q)

  return request<PaginatedTropels>(`/tropels?${params.toString()}`, { signal }, token)
}

export function getSignalsFeed(
  token: string,
  filters: SignalFeedFilters,
  cursor?: string | null,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams()
  params.set('limit', String(filters.limit))

  if (cursor) params.set('cursor', cursor)
  if (filters.signalType) params.set('signalType', filters.signalType)
  if (filters.severity) params.set('severity', filters.severity)
  if (filters.status) params.set('status', filters.status)
  if (filters.q) params.set('q', filters.q)

  return request<SignalFeedResponse>(`/signals/feed?${params.toString()}`, { signal }, token)
}

export function getSignal(token: string, id: string, signal?: AbortSignal) {
  return request<Signal>(`/signals/${id}`, { signal }, token)
}

export function updateSignalStatus(token: string, id: string, status: MutableSignalStatus) {
  return request<Signal>(
    `/signals/${id}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
    token,
  )
}
