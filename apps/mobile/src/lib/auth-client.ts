import { expoClient } from '@better-auth/expo/client'
import { createAuthClient } from 'better-auth/react'
import * as SecureStore from 'expo-secure-store'
import { API_URL } from '@/lib/env'

/**
 * Better Auth owns sign-in and sign-out, exactly as on the web. The Expo
 * plugin is what makes it work without a browser cookie jar: it keeps the
 * session cookie in SecureStore and hands it back through `getCookie()` for
 * the API client to attach to its own requests.
 *
 * `scheme` matches `expo.scheme` in app.json and is what the API lists as a
 * trusted origin for requests from the app.
 */
export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: 'opsflow',
      storagePrefix: 'opsflow',
      storage: SecureStore,
    }),
  ],
})
