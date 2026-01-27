import { Context } from 'hono'
import { jwt } from 'hono/jwt'
import { HTTPException } from 'hono/http-exception'

export const authenticateAdmin = jwt({
  secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  alg: 'HS256',
})

export const getCurrentAdmin = (c: Context) => {
  const payload = c.get('jwtPayload')
  if (!payload) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }
  return {
    id: payload.sub as string,
    email: payload.email as string,
    role: payload.role as string,
  }
}
