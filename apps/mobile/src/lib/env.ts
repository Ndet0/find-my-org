import Constants from 'expo-constants'

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

/** Loopback and tunnel hosts are rejected, so only `1.2.3.4` style hosts pass. */
const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/

/** Splits `http://host:3000/base` so only the host is swapped out. */
const URL_PARTS = /^(https?:\/\/)(?:\[[^\]]*\]|[^/:?#]*)(:\d+)?([/?#].*)?$/

/**
 * The address the device used to reach Metro, e.g. `192.168.1.5:8081`.
 * Present only when running against a dev server started by @expo/cli.
 */
function devServerHostname(): string | null {
  const hostUri = Constants.expoConfig?.hostUri?.trim()

  if (!hostUri) {
    return null
  }

  const [hostname] = hostUri.split(':')

  // A tunnel host resolves but only proxies Metro's port, so it cannot reach
  // the API. Loopback is the simulator, and there the configured address is
  // already right — and on a USB-attached Android it is the only thing that
  // works, since only Metro's port gets reversed.
  if (!hostname || !IPV4.test(hostname) || hostname.startsWith('127.')) {
    return null
  }

  return hostname
}

/**
 * In development the machine's LAN address changes with the network it joins,
 * which silently strands the app on a dead address until `.env` is edited by
 * hand. The dev server host is by definition one the device just reached, so
 * it is a better answer than the configured one — the scheme, port and base
 * path still come from `EXPO_PUBLIC_API_URL`, which stays the single place
 * the API's location is described.
 *
 * Anything unrecognised falls back to the configured value, so this can only
 * do as well as, or better than, hardcoding.
 */
function resolveApiUrl(configured: string): string {
  if (!__DEV__) {
    return configured
  }

  const hostname = devServerHostname()

  if (!hostname) {
    return configured
  }

  const parts = configured.match(URL_PARTS)

  if (!parts) {
    return configured
  }

  const [, scheme, port = '', path = ''] = parts

  return `${scheme}${hostname}${port}${path}`
}

export const API_URL = resolveApiUrl(configuredUrl)
