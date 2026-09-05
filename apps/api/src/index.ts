import { app } from './app.js'
import { env } from './lib/env.js'

console.log(`OPSflow API listening on http://localhost:${env.API_PORT}`)

export default {
  port: env.API_PORT,
  fetch: app.fetch,
}
