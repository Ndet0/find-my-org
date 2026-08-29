import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { env } from './lib/env.js'
import { onError, onNotFound } from './middleware/error.js'
import { healthRoutes } from './routes/health.js'

const app = new Hono()

app.use('*', logger())
app.use('*', secureHeaders())

// `credentials: true` is required for Better Auth's session cookie to
// survive the web app (:5173) -> API (:3000) origin hop.
app.use(
  '*',
  cors({
    origin: [env.WEB_URL],
    credentials: true,
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
)

app.onError(onError)
app.notFound(onNotFound)

const api = new Hono()
api.route('/health', healthRoutes)

app.route('/api', api)

console.log(`OPSflow API listening on http://localhost:${env.API_PORT}`)

export default {
  port: env.API_PORT,
  fetch: app.fetch,
}
