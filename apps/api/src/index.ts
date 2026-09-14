import { app } from './app.js'
import { port } from './lib/env.js'

console.log(`OPSflow API listening on port ${port}`)

export default {
  port,
  fetch: app.fetch,
}
