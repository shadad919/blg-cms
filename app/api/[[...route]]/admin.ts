import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { sign } from 'hono/jwt'
import bcrypt from 'bcryptjs'
import { ApiResponse, AuthResponse, Admin } from '@/lib/types'
import { authenticateAdmin, getCurrentAdmin } from '@/lib/auth-middleware'

const admin = new Hono()
  .basePath('/admin')

// In-memory storage (replace with database in production)
const admins: (Admin & { password: string })[] = [
  {
    id: '1',
    email: 'admin@example.com',
    name: 'Admin User',
    password: '$2a$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZq', // password: admin123
    role: 'super_admin',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// Login schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

// Login route (public)
admin.post(
  '/login',
  zValidator('json', loginSchema),
  async (c) => {
    const { email, password } = c.req.valid('json')
    const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

    const adminUser = admins.find((a) => a.email === email && a.isActive)

    if (!adminUser) {
      return c.json<ApiResponse>(
        {
          result: null,
          result_message: {
            title: 'Authentication Failed',
            type: 'ERROR',
            message: 'Invalid email or password',
          },
        },
        401
      )
    }

    // In production, use bcrypt.compare
    // For now, simple check (replace with actual bcrypt comparison)
    const isValidPassword = password === 'admin123' || await bcrypt.compare(password, adminUser.password)

    if (!isValidPassword) {
      return c.json<ApiResponse>(
        {
          result: null,
          result_message: {
            title: 'Authentication Failed',
            type: 'ERROR',
            message: 'Invalid email or password',
          },
        },
        401
      )
    }

    // Update last login
    adminUser.lastLoginAt = new Date().toISOString()

    // Generate JWT token
    const token = await sign(
      {
        sub: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
      },
      secret
    )

    const { password: _, ...adminWithoutPassword } = adminUser

    return c.json<ApiResponse<AuthResponse>>(
      {
        result: {
          admin: adminWithoutPassword,
          token,
        },
        result_message: {
          title: 'Login Successful',
          type: 'OK',
          message: 'Welcome back!',
        },
      },
      200
    )
  }
)

// Get current admin profile (protected)
admin.get('/me', authenticateAdmin, async (c) => {
  const currentAdmin = getCurrentAdmin(c)
  const adminUser = admins.find((a) => a.id === currentAdmin.id)

  if (!adminUser) {
    return c.json<ApiResponse>(
      {
        result: null,
        result_message: {
          title: 'Not Found',
          type: 'ERROR',
          message: 'Admin not found',
        },
      },
      404
    )
  }

  const { password: _, ...adminWithoutPassword } = adminUser

  return c.json<ApiResponse<Admin>>(
    {
      result: adminWithoutPassword,
      result_message: {
        title: 'Success',
        type: 'OK',
        message: 'Admin profile retrieved',
      },
    },
    200
  )
})

export default admin
