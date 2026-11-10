export interface ApiErrorResponse {
  error: string
  message: string
  details?: Record<string, any> | null
  timestamp: string
  path: string
  requestId: string
}

export class LumonApiError extends Error {
  error: string
  details: Record<string, any> | null
  statusCode: number
  requestId: string
  retryAfter?: number

  constructor(res: ApiErrorResponse, statusCode: number, retryAfter?: number) {
    super(res.message || res.error)
    this.name = 'LumonApiError'
    this.error = res.error
    this.details = res.details ?? null
    this.statusCode = statusCode
    this.requestId = res.requestId
    this.retryAfter = retryAfter
  }
}

export interface AuthUser {
  id: number
  email: string
  displayName: string
}

export interface TeamInfo {
  code: string
  name: string
}

export interface RoleInfo {
  code: string
  name: string
}

export interface ClearanceInfo {
  granted: boolean
  grantedAt: string | null
}

export interface AuthMeResponse {
  id: number
  email: string
  displayName: string
  team: TeamInfo
  role: RoleInfo
  permissions: string[]
  clearance: ClearanceInfo
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: AuthUser
}

export interface FileProgress {
  total: number
  refined: number
  percentage: number
  bins: {
    WO: number
    FC: number
    DR: number
    MA: number
  }
}

export interface FileSummary {
  id: number
  name: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  rows: number
  cols: number
  tileSize: number
  progress: FileProgress
  mistakes: number
  createdAt: string
  updatedAt: string
}

export interface FilePage {
  content: FileSummary[]
  totalElements: number
  totalPages: number
  page: number
  size: number
}

export interface FileRules {
  tremorThreshold: number
  connectivity: 4 | 8
  minGroupSize: number
  maxGroupSize: number
  binning: {
    strategy: 'DIGIT_SUM_MOD' | 'MAX_DIGIT_MOD'
    order: ('WO' | 'FC' | 'DR' | 'MA')[]
  }
}

export interface TileData {
  tileRow: number
  tileCol: number
  originRow: number
  originCol: number
  rows: number
  cols: number
  values: string
  tremor: string // base64
  bins: string
  version: number
}

export interface RefinementPayload {
  bin: 'WO' | 'FC' | 'DR' | 'MA'
  cells: { r: number; c: number }[]
}

export interface RefinementResponse {
  fileId: number
  cellsRefined: number
  bin: 'WO' | 'FC' | 'DR' | 'MA'
  progress: FileProgress
}

export interface IntegrationStatus {
  deploy: {
    origin: string | null
    verifiedAt: string | null
    lastBuildSeen: string | null
    lastBuildSeenAt: string | null
    pendingChallenge: {
      token: string
      url: string
      expiresAt: string
    } | null
  }
  storage: {
    provider: 'SUPABASE' | 'CLOUDINARY' | null
    verifiedAt: string | null
    checks: {
      name: string
      passed: boolean
      reason?: string
    }[]
    config: Record<string, any> | null
  }
  clearance: {
    granted: boolean
    grantedAt: string | null
  }
}

export interface ClearanceCheckResult {
  granted: boolean
  checks: {
    name: string
    passed: boolean
    reason?: string
  }[]
}
