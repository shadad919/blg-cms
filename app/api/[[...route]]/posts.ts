import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { ApiResponse, Post, PaginatedResponse, PostStatus, PostPriority } from '@/lib/types'
import { authenticateAdmin, getCurrentAdmin } from '@/lib/auth-middleware'
import { dummyPosts } from '@/lib/dummyData'

const posts = new Hono()
  .basePath('/posts')

// In-memory storage (replace with database in production)
// Initialize with dummy data
let postsData: Post[] = [...dummyPosts]

// Post creation schema
const createPostSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  authorId: z.string().optional(),
  authorName: z.string().optional(),
  category: z.enum(['road', 'electricity', 'street_light', 'building', 'wall', 'water', 'mine']).default('road'),
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
  const page = Number(c.req.query('page')) || 1
  const limit = Number(c.req.query('limit')) || 10
  const search = c.req.query('search') || ''
  const status = c.req.query('status') as PostStatus | undefined
  const priority = c.req.query('priority') as PostPriority | undefined
  const sortBy = c.req.query('sortBy') || 'createdAt'
  const sortOrder = c.req.query('sortOrder') === 'asc' ? 'asc' : 'desc'

  // Filter posts
  let filteredPosts = [...postsData]

  if (search) {
    const searchLower = search.toLowerCase()
    filteredPosts = filteredPosts.filter(
      (post) =>
        post.title.toLowerCase().includes(searchLower) ||
        post.content?.toLowerCase().includes(searchLower) ||
        post.authorName?.toLowerCase().includes(searchLower)
    )
  }

  if (status) {
    filteredPosts = filteredPosts.filter((post) => post.status === status)
  }

  if (priority) {
    filteredPosts = filteredPosts.filter((post) => post.priority === priority)
  }

  // Sort posts
  filteredPosts.sort((a, b) => {
    const aValue = a[sortBy as keyof Post]
    const bValue = b[sortBy as keyof Post]

    if (sortOrder === 'asc') {
      return aValue && bValue ? (aValue > bValue ? 1 : -1) : 0
    } else {
      return aValue && bValue ? (aValue < bValue ? 1 : -1) : 0
    }
  })

  // Paginate
  const total = filteredPosts.length
  const totalPages = Math.ceil(total / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedPosts = filteredPosts.slice(startIndex, endIndex)

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
          sortOrder,
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
})

// Get single post
posts.get('/:id', async (c) => {
  const id = c.req.param('id')
  const post = postsData.find((p) => p.id === id || p._id === id)

  if (!post) {
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
})

// Create post (from Android app or admin)
posts.post(
  '/',
  authenticateAdmin,
  zValidator('json', createPostSchema),
  async (c) => {
    const data = c.req.valid('json')
    const currentAdmin = getCurrentAdmin(c)

    const postId = Date.now().toString()
    const newPost: Post = {
      _id: postId,
      id: postId,
      title: data.title,
      content: data.content,
      authorId: data.authorId,
      authorName: data.authorName,
      status: 'pending',
      priority: data.priority,
      tags: data.tags,
      images: data.images,
      category: data.category,
      location: data.location as unknown as Post['location'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    postsData.push(newPost)

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
  }
)

// Update post
posts.patch(
  '/:id',
  authenticateAdmin,
  zValidator('json', updatePostSchema),
  async (c) => {
    const id = c.req.param('id')
    const data = c.req.valid('json')
    const currentAdmin = getCurrentAdmin(c)

    const postIndex = postsData.findIndex((p) => p.id === id || p._id === id)

    if (postIndex === -1) {
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

    const post = postsData[postIndex]
    const updatedPost: Post = {
      ...post,
      ...data,
      location: data.location as unknown as Post['location'],
      updatedAt: new Date().toISOString(),
    }

    // If status changed to approved/published, set reviewed info
    if (data.status && ['approved', 'published'].includes(data.status)) {
      updatedPost.reviewedBy = currentAdmin.id
      updatedPost.reviewedAt = new Date().toISOString()
      if (data.status === 'published') {
        updatedPost.publishedAt = new Date().toISOString()
      }
    }

    postsData[postIndex] = updatedPost

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
  }
)

// Delete post
posts.delete('/:id', authenticateAdmin, async (c) => {
  const id = c.req.param('id')
  const postIndex = postsData.findIndex((p) => p.id === id)

  if (postIndex === -1) {
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

  postsData.splice(postIndex, 1)

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
})

export default posts
