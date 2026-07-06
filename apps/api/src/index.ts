// apps/api/src/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { tenantMiddleware } from './middleware/tenant'
import { chat, business } from './routes'

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

app.get('/', (c) => {
  return c.json({ message: 'Qulify API is live' })
})

app.use('/chat/*', tenantMiddleware)
app.route('/chat', chat)
app.route('/business', business)

export default app