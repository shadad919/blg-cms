import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { HTTPException } from 'hono/http-exception'
import admin from './admin'
import posts from './posts'
import users from './users'
import settings from './settings'
import stats from './stats'

const app = new Hono()
  .basePath('/api')
  .route('/admin', admin)
  .route('/posts', posts)
  .route('/users', users)
  .route('/settings', settings)
  .route('/stats', stats)

app.onError((err, c) => {
  console.error(err)
  if (err instanceof HTTPException) {
    return c.json(
      {
        result: null,
        result_message: {
          title: 'Error',
          type: 'ERROR',
          message: err.message,
        },
      },
      err.status
    )
  }
  return c.json(
    {
      result: null,
      result_message: {
        title: 'Internal Server Error',
        type: 'ERROR',
        message: 'An unexpected error occurred',
      },
    },
    500
  )
})

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
export const PATCH = handle(app)
export const OPTIONS = handle(app)
export const HEAD = handle(app)

export type AppType = typeof app
