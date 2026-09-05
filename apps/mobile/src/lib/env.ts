const apiUrl = process.env.EXPO_PUBLIC_API_URL

/**
 * Expo inlines `EXPO_PUBLIC_*` variables at bundle time, so a missing one
 * arrives as `undefined`. The mobile scripts load the repository root `.env`
 * before starting Expo, which is where this is set.
 *
 * On a physical device `localhost` is the phone, not the machine running the
 * API, so the value has to be the machine's LAN address in that case.
 */
if (!apiUrl) {
  throw new Error('EXPO_PUBLIC_API_URL is not set — it is read from the repository root .env')
}

export const API_URL = apiUrl
