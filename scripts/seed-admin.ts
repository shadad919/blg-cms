/**
 * Script to seed the initial admin user in MongoDB
 * Run with: npm run seed:admin
 */

// Load environment variables from .env.local FIRST, before any other imports
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

// Now import other modules that depend on environment variables
import { getAdminsCollection } from '@/lib/mongodb'
import bcrypt from 'bcryptjs'


async function seedAdmin() {
  try {
    const collection = await getAdminsCollection()

    // Check if admin already exists
    const existingAdmin = await collection.findOne({ email: 'admin@example.com' })

    if (existingAdmin) {
      console.log('Admin user already exists. Skipping seed.')
      return
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('1234', 10)

    // Create default admin
    const now = new Date().toISOString()
    const adminDoc = {
      email: 'shady@blg.com',
      name: 'Shady',
      password: hashedPassword,
      role: 'super_admin' as const,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }

    const result = await collection.insertOne(adminDoc)

    console.log('✅ Admin user created successfully!')
      console.log('Email: shady@blg.com')
      console.log('Password: 1234')
    console.log('Admin ID:', result.insertedId.toString())
    console.log('\n⚠️  Please change the default password after first login!')
  } catch (error) {
    console.error('❌ Error seeding admin:', error)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

seedAdmin()
