import { auth } from '@opsflow/auth'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { env, isProduction } from './lib/env.js'
import { forbidden } from './lib/errors.js'
import { onError, onNotFound } from './middleware/error.js'
import { activityRoutes } from './routes/activity.js'
import { clientRoutes } from './routes/clients.js'
import { commentRoutes } from './routes/comments.js'
import { dashboardRoutes } from './routes/dashboard.js'
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
//
// Native mobile requests carry no Origin header and are not subject to CORS;
// the mobile app's web build, used to exercise it in a browser during
// development, runs on Expo's dev server and is allowed only outside
// production. It is listed as a trusted origin in packages/auth for the
// same reason.
app.use(
  '*',
  cors({
    origin: [env.WEB_URL, ...(isProduction ? [] : ['http://localhost:8081'])],
    credentials: true,
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    // Browsers may cache the preflight answer this long, so a burst of
    // PATCHes from one page costs one OPTIONS rather than one each.
    maxAge: 600,
  }),
)

// The largest legal body is a task or project with a 5 000-character
// description and every other field at its limit — a few kilobytes. 64 KiB
// leaves room for that and stops a request from being read into memory
// before Zod ever sees it; without this, Bun's own ceiling is 128 MiB.
app.use('/api/*', bodyLimit({ maxSize: 64 * 1024 }))

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

// Better Auth's own profile edit would let anyone rewrite their `name` and
// `image` past `updateProfileSchema` and the activity log. OPSflow's profile
// edit is `PATCH /api/me`; the clients never call this.
api.post('/auth/update-user', () => {
  throw forbidden('Profiles are edited through /api/me')
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
api.route('/comments', commentRoutes)
api.route('/activity', activityRoutes)
api.route('/notifications', notificationRoutes)
api.route('/dashboard', dashboardRoutes)

app.route('/api', api)

/**
 * The assembled application, without a listener. `index.ts` serves it;
 * the tests call `app.request()` against it in-process.
 */
export { app }
