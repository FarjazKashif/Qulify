// apps/api/src/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { tenantMiddleware } from './middleware/tenant'
import { chat, business, leads } from './routes'
import { validateEnv } from '@qulify/shared'

type Env = {
  Bindings: {
    DATABASE_URL: string
    GROQ_API_KEY: string
    OPENAI_API_KEY: string
    RESEND_API_KEY: string
    RESEND_FROM_EMAIL: string
  }
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors())

// Validate env vars once per request, before any route logic runs.
// Cloudflare Workers don't have a single "startup" hook the way a
// long-running Node server does — env is only available per-request
// via c.env, so this is the earliest point validation can happen.
app.use('*', async (c, next) => {
  try {
    validateEnv(c.env)
  } catch (error) {
    console.error('[env] Validation failed:', error)
    return c.json({ success: false, error: 'Server misconfigured' }, 500)
  }
  await next()
})

app.get('/', (c) => {
  return c.json({ message: 'Qulify API is live' })
})

app.use('/chat/*', tenantMiddleware)
app.route('/chat', chat)
app.route('/business', business)
app.route('/leads', leads)

export default app