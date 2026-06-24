// apps/api/src/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { tenantMiddleware } from './middleware/tenant'
import { chat } from './routes'

type Env = {
  DATABASE_URL: string
  GROQ_API_KEY: string
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors())

// Health check — no auth needed
app.get('/', (c) => {
  return c.json({ message: 'Qulify API is live' })
})

// All chat routes require a valid business_id
app.use('/chat/*', tenantMiddleware)
app.route('/chat', chat)

export default app