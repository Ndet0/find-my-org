import { auth } from '@opsflow/auth'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { env } from './lib/env.js'
import { forbidden } from './lib/errors.js'
import { onError, onNotFound } from './middleware/error.js'
import { activityRoutes } from './routes/activity.js'
import { clientRoutes } from './routes/clients.js'
import { departmentRoutes } from './routes/departments.js'
import { healthRoutes } from './routes/health.js'
import { meRoutes } from './routes/me.js'
import { notificationRoutes } from './routes/notifications.js'
import { projectRoutes } from './routes/projects.js'
import { taskRoutes } from './routes/tasks.js'
import { userRoutes } from './routes/users.js'

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

// Accounts are provisioned by an admin through `POST /api/users`, so nothing
// on the network may reach Better Auth's signup endpoint.
//
// This is a route guard rather than `emailAndPassword.disableSignUp` because
// that option is checked inside the endpoint handler, which `signUpEmail()`
// also runs — setting it would break the admin-create path and the user seed
// along with the public route. Blocking the HTTP path leaves the in-process
// API working for both.
api.post('/auth/sign-up/email', () => {
  throw forbidden('Accounts are created by an administrator')
})

// Better Auth owns every other method under its basePath (`/api/auth`) and
// returns a Response directly, so it is mounted before the application's own
// routes.
api.all('/auth/*', (c) => auth.handler(c.req.raw))

api.route('/health', healthRoutes)
api.route('/me', meRoutes)
api.route('/users', userRoutes)
api.route('/departments', departmentRoutes)
api.route('/clients', clientRoutes)
api.route('/projects', projectRoutes)
api.route('/tasks', taskRoutes)
api.route('/activity', activityRoutes)
api.route('/notifications', notificationRoutes)

app.route('/api', api)

console.log(`OPSflow API listening on http://localhost:${env.API_PORT}`)

export default {
  port: env.API_PORT,
  fetch: app.fetch,
}
