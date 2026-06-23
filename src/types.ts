export type User = {
  id: string
  displayName: string
  email: string
  teamCode: string
  role: 'OPERATOR'
}

export type LoginResponse = {
  token: string
  expiresAt: string
  user: User
}

export type DashboardSummary = {
  totalTropels: number
  criticalTropels: number
  openSignals: number
  sectorStabilityAvg: number
  signalsBySeverity: {
    LEVE: number
    MODERADO: number
    GRAVE: number
    CRITICO: number
  }
  generatedAt: string
}

export type ApiErrorResponse = {
  error: string
  message: string
  timestamp: string
  path: string
  details: Record<string, unknown>
}

export type LoginForm = {
  teamCode: string
  email: string
  password: string
}

export type Species = 'BLOBITO' | 'CHISPA' | 'GRUNON' | 'DORMILON' | 'GLITCHY'

export type VitalState = 'ESTABLE' | 'HAMBRIENTO' | 'AGITADO' | 'MUTANDO' | 'CRITICO'

export type TropelSort = 'name,asc' | 'updatedAt,desc' | 'chaosIndex,desc'

export type TropelOrderField =
  | 'name'
  | 'species'
  | 'vitalState'
  | 'sector'
  | 'energyLevel'
  | 'chaosIndex'
  | 'updatedAt'

export type SortDirection = 'asc' | 'desc'

export type Sector = {
  id: string
  sectorCode: string
  name: string
  climate: Climate
  capacity: number
  currentLoad: number
  stabilityLevel: number
}

export type Climate = 'PIXEL_FOREST' | 'NEON_CAVE' | 'CLOUD_AQUARIUM' | 'RETRO_ARCADE'

export type Tropel = {
  id: string
  name: string
  species: Species
  vitalState: VitalState
  energyLevel: number
  chaosIndex: number
  mutationStage: number
  guardianName: string
  sector: {
    id: string
    name: string
    sectorCode: string
  }
  createdAt: string
  updatedAt: string
}

export type PaginatedTropels = {
  content: Tropel[]
  totalElements: number
  totalPages: number
  currentPage: number
  size: number
}

export type TropelFilters = {
  page: number
  size: number
  species?: string
  vitalState?: string
  sectorId?: string
  q?: string
  sort: TropelSort
  orderBy: TropelOrderField
  orderDir: SortDirection
}

export type SectorsResponse = {
  items: Sector[]
}

export type SignalType =
  | 'HAMBRE'
  | 'ABANDONO'
  | 'MUTACION'
  | 'FUGA'
  | 'CONFLICTO'
  | 'REPRODUCCION_MASIVA'
  | 'SENAL_CORRUPTA'

export type Severity = 'LEVE' | 'MODERADO' | 'GRAVE' | 'CRITICO'

export type SignalStatus = 'RECIBIDA' | 'PROCESANDO' | 'ATENDIDA'

export type MutableSignalStatus = 'PROCESANDO' | 'ATENDIDA'

export type Signal = {
  id: string
  signalType: SignalType
  severity: Severity
  status: SignalStatus
  rawContent: string
  tropel: {
    id: string
    name: string
    species: Species
  }
  createdAt: string
  updatedAt: string
}

export type SignalFeedFilters = {
  limit: number
  signalType?: string
  severity?: string
  status?: string
  q?: string
}

export type SignalFeedResponse = {
  items: Signal[]
  nextCursor: string | null
  hasMore: boolean
  totalEstimate: number
}

export type SectorStoryStage = {
  id: string
  order: number
  title: string
  narrative: string
  dominantEvent: SignalType
  metrics: {
    stability: number
    energy: number
    alerts: number
  }
  assetKey: string
  colorToken: string
  progress: number
}

export type SectorStory = {
  sector: {
    id: string
    name: string
    climate: Climate
  }
  stages: SectorStoryStage[]
}
