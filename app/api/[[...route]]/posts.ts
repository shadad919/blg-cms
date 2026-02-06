import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { ObjectId } from 'mongodb'
import { put } from '@vercel/blob'
import { ApiResponse, Post, PaginatedResponse, PostStatus, PostPriority } from '@/lib/types'
import { authenticateAdmin, getCurrentAdmin } from '@/lib/auth-middleware'
import { getCategoriesCollection, getPostsCollection, getUsersCollection, getSettingsCollection } from '@/lib/mongodb'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

const GEOPROXY_KEY = process.env.GEOPROXY_KEY ?? process.env.NEXT_PUBLIC_GEOPROXY_KEY

async function reverseGeocodeServer(
  lat: number,
  lng: number,
  language: string = 'en'
): Promise<string | null> {
  if (!GEOPROXY_KEY) return null
  try {
    const q = `${lat}+${lng}`
    const url = `https://www.gps-coordinates.net/geoproxy?q=${encodeURIComponent(q)}&key=9416bf2c8b1d4751be6a9a9e94ea85ca&no_annotations=1&language=en`
    const res = await fetch(url)
    const data = await res.json();
    console.log('address data:', data)
    if (data.status?.code !== 200 || !Array.isArray(data.results) || data.results.length === 0) return null
    return data.results[0].formatted ?? null
  } catch (err) {
    console.error('Reverse geocode error:', err)
    return null
  }
}

const IMAGE_EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}
//

function getExtensionFromBase64(base64: string): string {
  const match = base64.match(/^data:image\/(\w+);base64,/)
  if (match) return IMAGE_EXT_MAP[`image/${match[1]}`] || match[1]
  return 'jpg'
}

function normalizeImageFilename(filename: string, extension: string): string {
  const ext = extension.startsWith('.') ? extension.slice(1) : extension
  const lower = filename.toLowerCase()
  return lower.endsWith(ext) || lower.endsWith(`.${ext}`) ? filename : `${filename}.${ext}`
}

async function uploadBase64ToBlob(
  base64: string,
  filename: string
): Promise<{ publicUrl: string }> {
  const extension = getExtensionFromBase64(base64)
  const normalizedFilename = normalizeImageFilename(filename, extension)
  const pathname = `posts/${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${normalizedFilename}`

  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '')
  const buffer = Buffer.from(base64Data, 'base64')

  const blob = await put(pathname, buffer, {
    access: 'public',
    contentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
    addRandomSuffix: false,
  })

  return { publicUrl: blob.url }
}

const posts = new Hono()

// Helper function to convert MongoDB document to Post
function convertToPost(doc: any): Post {
  return {
    _id: doc._id.toString(),
    id: doc._id.toString(),
    title: doc.title,
    content: doc.content ?? "",
    authorId: doc.authorId,
    authorName: doc.authorName,
    status: doc.status,
    category: doc.category,
    priority: doc.priority,
    tags: doc.tags,
    images: doc.images,
    metadata: doc.metadata,
    location: doc.location,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    publishedAt: doc.publishedAt,
    reviewedBy: doc.reviewedBy,
    reviewedAt: doc.reviewedAt,
    rejectionReason: doc.rejectionReason,
  }
}

// Post creation schema – images sent as base64 + filename, uploaded to Vercel Blob
const createPostSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  authorId: z.string().optional(),
  authorName: z.string().optional(),
  category: z.enum(['road', 'electricity', 'street_light', 'building', 'wall', 'water', 'mine']),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  tags: z.array(z.string()).optional(),
  images: z
    .array(
      z.object({
        localUrl: z.string().optional(),
        base64: z.string(),
        filename: z.string(),
      })
    )
    .optional(),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      address: z.string().optional(),
    })
    .optional(),
})

// Post update schema
const updatePostSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'rejected']).optional(),
  rejectionReason: z.string().optional(),
  category: z.enum(['road', 'electricity', 'street_light', 'building', 'wall', 'water', 'mine']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  tags: z.array(z.string()).optional(),
  images: z
    .array(
      z.object({
        localUrl: z.string(),
        publicUrl: z.string(),
      })
    )
    .optional(),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      address: z.string().optional(),
    })
    .optional(),
})

// Get all posts with pagination and filters
posts.get('/', async (c) => {
  try {
    const page = Number(c.req.query('page')) || 1
    const limit = Number(c.req.query('limit')) || 10
    const search = c.req.query('search') || ''
    const status = c.req.query('status') as string | undefined
    const priority = c.req.query('priority') as PostPriority | undefined
    const category = c.req.query('category') as string | undefined
    const startDate = c.req.query('startDate') as string | undefined
    const endDate = c.req.query('endDate') as string | undefined
    const hasLocation = c.req.query('hasLocation') === 'true'
    const sortBy = c.req.query('sortBy') || 'createdAt'
    const sortOrder = c.req.query('sortOrder') === 'asc' ? 1 : -1

    const collection = await getPostsCollection()

    // Build filter query
    const filter: any = {}

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { authorName: { $regex: search, $options: 'i' } },
      ]
    }

    // Status: missing or 'all' => exclude rejected; otherwise filter by status
    if (status && status !== 'all') {
      filter.status = status
    } else {
      filter.status = { $ne: 'rejected' }
    }

    if (priority) {
      filter.priority = priority
    }

    if (category && category !== 'all') {
      filter.category = category
    }

    if (startDate || endDate) {
      filter.createdAt = {}
      if (startDate) filter.createdAt.$gte = new Date(startDate)
      if (endDate) filter.createdAt.$lte = new Date(endDate)
    }

    if (hasLocation) {
      filter['location.latitude'] = { $exists: true, $ne: null }
      filter['location.longitude'] = { $exists: true, $ne: null }
    }

    // Get total count
    const total = await collection.countDocuments(filter)

    // Build sort object
    const sort: any = {}
    sort[sortBy] = sortOrder

    // Execute query with pagination
    const skip = (page - 1) * limit
    const cursor = collection.find(filter).sort(sort).skip(skip).limit(limit)
    const docs = await cursor.toArray()

    const paginatedPosts = docs.map(convertToPost)
    const totalPages = Math.ceil(total / limit)

    return c.json<ApiResponse<PaginatedResponse<Post>>>(
      {
        result: {
          data: paginatedPosts,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
          filters: {
            search,
            status,
            priority,
            category,
            startDate,
            endDate,
            hasLocation,
            sortBy,
            sortOrder: sortOrder === 1 ? 'asc' : 'desc',
          },
        },
        result_message: {
          title: 'Success',
          type: 'OK',
          message: 'Posts retrieved successfully',
        },
      },
      200
    )
  } catch (error) {
    console.error('Error fetching posts:', error)
    return c.json<ApiResponse>(
      {
        result: null,
        result_message: {
          title: 'Error',
          type: 'ERROR',
          message: 'Failed to retrieve posts',
        },
      },
      500
    )
  }
})
posts.get('/user/:id', async (c) => {
  const userId = c.req.param('id') as string;
  const page = Number(c.req.query('page')) || 1
  const limit = Number(c.req.query('limit')) || 10
  const collection = await getPostsCollection();
  const posts = await collection.find({ authorId: userId }).skip((page - 1) * limit).limit(limit).toArray();
  const total = await collection.countDocuments({ authorId: userId });
  const totalPages = Math.ceil(total / limit);
  return c.json<ApiResponse<PaginatedResponse<Post>>>(
    {
      result: {
        data: posts.map(convertToPost).sort((a: Post, b: Post) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    result_message: {
      title: 'Success',
      type: 'OK',
      message: 'Posts fetched successfully',
    },
  });
});
// Get single post
posts.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const collection = await getPostsCollection()

    // Try to find by ObjectId first, then by string id
    let doc = null
    if (ObjectId.isValid(id)) {
      doc = await collection.findOne({ _id: new ObjectId(id) })
    }
    if (!doc) {
      doc = await collection.findOne({ $or: [{ id: id }] })
    }

    if (!doc) {
      return c.json<ApiResponse>(
        {
          result: null,
          result_message: {
            title: 'Not Found',
            type: 'ERROR',
            message: 'Post not found',
          },
        },
        404
      )
    }

    const post = convertToPost(doc)

    return c.json<ApiResponse<Post>>(
      {
        result: post,
        result_message: {
          title: 'Success',
          type: 'OK',
          message: 'Post retrieved successfully',
        },
      },
      200
    )
  } catch (error) {
    console.error('Error fetching post:', error)
    return c.json<ApiResponse>(
      {
        result: null,
        result_message: {
          title: 'Error',
          type: 'ERROR',
          message: 'Failed to retrieve post',
        },
      },
      500
    )
  }
})

// Create post (public - from Android app)
posts.post(
  '/',
  zValidator('json', createPostSchema),
  async (c) => {
    try {
      const data = c.req.valid('json')
      const collection = await getPostsCollection()

      let uploadedImages: { localUrl: string; publicUrl: string }[] = []
      if (data.images && data.images.length > 0) {
        try {
          for (let i = 0; i < data.images.length; i++) {
            const { base64, filename } = data.images[i]
            const image = await uploadBase64ToBlob(base64, filename)
            uploadedImages.push({ localUrl: data.images[i].localUrl || '', publicUrl: image.publicUrl })
          }
        } catch (blobError) {
          console.error('Vercel Blob upload failed:', blobError)
          return c.json<ApiResponse>(
            {
              result: null,
              result_message: {
                title: 'Upload Error',
                type: 'ERROR',
                message:
                  process.env.BLOB_READ_WRITE_TOKEN
                    ? 'Image upload failed'
                    : 'Image upload not configured (BLOB_READ_WRITE_TOKEN missing)',
              },
            },
            500
          )
        }
      }

      const now = new Date().toISOString()
      let location = data.location
      if (location && typeof location.latitude === 'number' && typeof location.longitude === 'number') {
        const address = location.address?.trim() || (await reverseGeocodeServer(location.latitude, location.longitude))
        location = { ...location, address: address ?? location.address ?? undefined }
      }
      const newPostDoc = {
        title: data.title,
        content: data.content ?? "",
        authorId: data.authorId,
        authorName: data.authorName,
        status: 'pending' as PostStatus,
        priority: data.priority,
        tags: data.tags || [],
        images: uploadedImages,
        category: data.category,
        location,
        createdAt: now,
        updatedAt: now,
      }

      const result = await collection.insertOne(newPostDoc)
      const insertedDoc = await collection.findOne({ _id: result.insertedId })
      const newPost = convertToPost(insertedDoc!)

      return c.json<ApiResponse<Post>>(
        {
          result: newPost,
          result_message: {
            title: 'Success',
            type: 'OK',
            message: 'Post created successfully',
          },
        },
        201
      )
    } catch (error) {
      console.error('Error creating post:', error)
      return c.json<ApiResponse>(
        {
          result: null,
          result_message: {
            title: 'Error',
            type: 'ERROR',
            message: 'Failed to create post',
          },
        },
        500
      )
    }
  }
)

// Update post
posts.patch(
  '/:id',
  authenticateAdmin,
  zValidator('json', updatePostSchema),
  async (c) => {
    try {
      const id = c.req.param('id')
      const data = c.req.valid('json')
      const currentAdmin = getCurrentAdmin(c)
      const collection = await getPostsCollection()

      // Build query to find post
      let query: any = {}
      if (ObjectId.isValid(id)) {
        query._id = new ObjectId(id)
      } else {
        query.$or = [{ _id: id }, { id: id }]
      }

      // Check if post exists
      const existingDoc = await collection.findOne(query)
      if (!existingDoc) {
        return c.json<ApiResponse>(
          {
            result: null,
            result_message: {
              title: 'Not Found',
              type: 'ERROR',
              message: 'Post not found',
            },
          },
          404
        )
      }

      // Build update object
      const update: any = {
        ...data,
        updatedAt: new Date().toISOString(),
      }

      // Resolve address from coordinates when location is provided without address
      if (update.location && typeof update.location.latitude === 'number' && typeof update.location.longitude === 'number' && !update.location.address?.trim()) {
        const address = await reverseGeocodeServer(update.location.latitude, update.location.longitude)
        if (address) update.location = { ...update.location, address }
      }

      // If status changed to approved/published, set reviewed info
      if (data.status && ['processing', 'completed'].includes(data.status)) {
        update.reviewedBy = currentAdmin.id
        update.reviewedAt = new Date().toISOString()
      }
      // If status changed to rejected, set reviewed info and rejection reason
      if (data.status === 'rejected') {
        update.reviewedBy = currentAdmin.id
        update.reviewedAt = new Date().toISOString()
        if (data.rejectionReason != null) {
          update.rejectionReason = data.rejectionReason
        }
      }

      // Remove undefined values
      Object.keys(update).forEach((key) => {
        if (update[key] === undefined) {
          delete update[key]
        }
      })

      // Update the document
      await collection.updateOne(query, { $set: update })

      // Fetch updated document
      const updatedDoc = await collection.findOne(query)
      const updatedPost = convertToPost(updatedDoc!)

      // When status is set to processing, send WhatsApp to the category's linked number (callable function, no separate API)
      if (data.status === 'processing') {
        const category = updatedDoc?.category ?? existingDoc?.category
        if (category) {
          try {
            const settingsCol = await getSettingsCollection()
            const whatsappDoc = await settingsCol.findOne({ name: 'whatsapp_settings' })
            const categorySetting = whatsappDoc?.categories?.[category as keyof typeof whatsappDoc.categories]
            if (categorySetting?.linked && categorySetting?.phone?.trim()) {
              const message = await sendWhatsAppMessage({
                to: categorySetting.phone.trim(),
                text: 'You have a new report to process.',
              })
              console.log('WhatsApp message sent:', message)
            }
          } catch (whatsappErr) {
            console.error('WhatsApp notify on processing:', whatsappErr)
            // Do not fail the PATCH; post is already updated
          }
        }
      }

      return c.json<ApiResponse<Post>>(
        {
          result: updatedPost,
          result_message: {
            title: 'Success',
            type: 'OK',
            message: 'Post updated successfully',
          },
        },
        200
      )
    } catch (error) {
      console.error('Error updating post:', error)
      return c.json<ApiResponse>(
        {
          result: null,
          result_message: {
            title: 'Error',
            type: 'ERROR',
            message: 'Failed to update post',
          },
        },
        500
      )
    }
  }
)

// Delete post
posts.delete('/:id', authenticateAdmin, async (c) => {
  try {
    const id = c.req.param('id')
    const collection = await getPostsCollection()

    // Build query to find post
    let query: any = {}
    if (ObjectId.isValid(id)) {
      query._id = new ObjectId(id)
    } else {
      query.$or = [{ _id: id }, { id: id }]
    }

    const result = await collection.deleteOne(query)

    if (result.deletedCount === 0) {
      return c.json<ApiResponse>(
        {
          result: null,
          result_message: {
            title: 'Not Found',
            type: 'ERROR',
            message: 'Post not found',
          },
        },
        404
      )
    }

    return c.json<ApiResponse>(
      {
        result: null,
        result_message: {
          title: 'Success',
          type: 'OK',
          message: 'Post deleted successfully',
        },
      },
      200
    )
  } catch (error) {
    console.error('Error deleting post:', error)
    return c.json<ApiResponse>(
      {
        result: null,
        result_message: {
          title: 'Error',
          type: 'ERROR',
          message: 'Failed to delete post',
        },
      },
      500
    )
  }
})

export default posts
