import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { ObjectId } from 'mongodb'
import { ApiResponse, Post, PaginatedResponse, PostStatus, PostPriority } from '@/lib/types'
import { authenticateAdmin, getCurrentAdmin } from '@/lib/auth-middleware'
import { getPostsCollection } from '@/lib/mongodb'

const posts = new Hono()
  .basePath('/posts')

// Helper function to convert MongoDB document to Post
function convertToPost(doc: any): Post {
  return {
    _id: doc._id.toString(),
    id: doc._id.toString(),
    title: doc.title,
    content: doc.content,
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
  }
}

// Post creation schema
const createPostSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  authorId: z.string().optional(),
  authorName: z.string().optional(),
  category: z.enum(['road', 'electricity', 'street_light', 'building', 'wall', 'water', 'mine']),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  tags: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
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
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'published']).optional(),
  category: z.enum(['road', 'electricity', 'street_light', 'building', 'wall', 'water', 'mine']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  tags: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
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
    const status = c.req.query('status') as PostStatus | undefined
    const priority = c.req.query('priority') as PostPriority | undefined
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

    if (status) {
      filter.status = status
    }

    if (priority) {
      filter.priority = priority
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

// Create post (from Android app or admin)
posts.post(
  '/',
  authenticateAdmin,
  zValidator('json', createPostSchema),
  async (c) => {
    try {
      const data = c.req.valid('json')
      const currentAdmin = getCurrentAdmin(c)
      const collection = await getPostsCollection()

      const now = new Date().toISOString()
      const newPostDoc = {
        title: data.title,
        content: data.content,
        authorId: data.authorId,
        authorName: data.authorName,
        status: 'pending' as PostStatus,
        priority: data.priority,
        tags: data.tags || [],
        images: data.images || [],
        category: data.category,
        location: data.location,
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

      // If status changed to approved/published, set reviewed info
      if (data.status && ['approved', 'published'].includes(data.status)) {
        update.reviewedBy = currentAdmin.id
        update.reviewedAt = new Date().toISOString()
        if (data.status === 'published') {
          update.publishedAt = new Date().toISOString()
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
