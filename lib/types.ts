// Common API response structure
export interface ApiResponse<T = unknown> {
  result: T
  result_message: {
    title: string
    type: 'OK' | 'ERROR' | 'WARNING' | 'INFO'
    message: string
  }
}

// Pagination structure
export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

// Paginated response structure
export interface PaginatedResponse<T = unknown> {
  data: T[]
  pagination: PaginationInfo
  filters?: {
    search?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    [key: string]: unknown
  }
}

// Admin types
export interface Admin {
  id: string
  email: string
  name: string
  role: 'admin' | 'super_admin'
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

// Post types
export type PostStatus = 'pending' | 'processing' | 'completed' | 'approved' | 'rejected' | 'published'
export type PostPriority = 'low' | 'medium' | 'high' | 'critical'
export interface PostImage {
  localUrl: string
  publicUrl: string
}
export interface Post {
  _id: string
  id?: string // For compatibility
  title: string
  content?: string
  authorId?: string // Client ID from Android app
  authorName?: string
  status: PostStatus
  category: 'road' | 'electricity' | 'street_light' | 'building' | 'wall' | 'water' | 'mine'
  priority: PostPriority
  tags?: string[]
  images?: PostImage[]
  metadata?: Record<string, unknown>
  location?: {
    latitude: number
    longitude: number
    address: string
  }
  createdAt: string
  updatedAt: string
  publishedAt?: string
  reviewedBy?: string // Admin ID who reviewed
  reviewedAt?: string
  rejectionReason?: string
}

// Auth types
export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  admin: Omit<Admin, 'password'>
  token: string
}
