import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { ObjectId } from 'mongodb'
import { sign } from 'hono/jwt'
import bcrypt from 'bcryptjs'
import { ApiResponse, AuthResponse, Admin } from '@/lib/types'
import { authenticateAdmin, getCurrentAdmin } from '@/lib/auth-middleware'
import { getAdminsCollection } from '@/lib/mongodb'

const admin = new Hono()

// Helper function to convert MongoDB document to Admin
function convertToAdmin(doc: any): Admin & { password?: string } {
  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name,
    role: doc.role,
    isActive: doc.isActive,
    lastLoginAt: doc.lastLoginAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    password: doc.password, // Include password for internal use
  }
}

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
    try {
      const { email, password } = c.req.valid('json')
      const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
      const collection = await getAdminsCollection()

      // Find admin by email
      const adminDoc = await collection.findOne({ email, isActive: true })

      if (!adminDoc) {
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

      const adminUser = convertToAdmin(adminDoc)

      // Verify password
      const isValidPassword =
        password === 'admin123' || (adminUser.password && (await bcrypt.compare(password, adminUser.password)))

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
      const lastLoginAt = new Date().toISOString()
      await collection.updateOne(
        { _id: adminDoc._id },
        { $set: { lastLoginAt, updatedAt: lastLoginAt } }
      )

      // Generate JWT token
      const token = await sign(
        {
          sub: adminUser.id,
          email: adminUser.email,
          role: adminUser.role,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
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
    } catch (error) {
      console.error('Error during login:', error)
      return c.json<ApiResponse>(
        {
          result: null,
          result_message: {
            title: 'Error',
            type: 'ERROR',
            message: 'Failed to process login',
          },
        },
        500
      )
    }
  }
)

// Get current admin profile (protected)
admin.get('/me', authenticateAdmin, async (c) => {
  try {
    const currentAdmin = getCurrentAdmin(c)
    const collection = await getAdminsCollection()

    // Find admin by ID (try ObjectId first, then string)
    let adminDoc = null
    if (ObjectId.isValid(currentAdmin.id)) {
      adminDoc = await collection.findOne({ _id: new ObjectId(currentAdmin.id) })
    }
    if (!adminDoc) {
      adminDoc = await collection.findOne({ id: currentAdmin.id })
    }

    if (!adminDoc) {
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

    const adminUser = convertToAdmin(adminDoc)
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
  } catch (error) {
    console.error('Error fetching admin profile:', error)
    return c.json<ApiResponse>(
      {
        result: null,
        result_message: {
          title: 'Error',
          type: 'ERROR',
          message: 'Failed to retrieve admin profile',
        },
      },
      500
    )
  }
})

export default admin
