import Constants from 'expo-constants'
import { devServerHostname, resolveApiUrl } from '@/lib/api-url'

const configuredUrl = process.env.EXPO_PUBLIC_API_URL

/**
 * Expo inlines `EXPO_PUBLIC_*` variables at bundle time, so a missing one
 * arrives as `undefined`. The mobile scripts load the repository root `.env`
 * before starting Expo, which is where this is set.
 *
 * On a physical device `localhost` is the phone, not the machine running the
 * API, so the value has to be the machine's LAN address in that case.
 */
if (!configuredUrl) {
  throw new Error('EXPO_PUBLIC_API_URL is not set — it is read from the repository root .env')
}

// The host swap itself is in `api-url.ts`, where it can be tested; this file
// only supplies what Expo reports at runtime. `hostUri` is the address the
// device used to reach Metro, present only under a dev server started by
// @expo/cli.
export const API_URL = resolveApiUrl(
  configuredUrl,
  devServerHostname(Constants.expoConfig?.hostUri),
  __DEV__,
)
