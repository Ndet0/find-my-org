/**
 * The pure half of `env.ts`: given what Expo reports about the dev server,
 * where is the API? Kept apart because `env.ts` imports `expo-constants`,
 * which imports react-native, which Bun cannot load; `env.ts` reads the
 * runtime values and calls these.
 */

/** Loopback and tunnel hosts are rejected, so only `1.2.3.4` style hosts pass. */
const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/

/** Splits `http://host:3000/base` so only the host is swapped out. */
const URL_PARTS = /^(https?:\/\/)(?:\[[^\]]*\]|[^/:?#]*)(:\d+)?([/?#].*)?$/

/**
 * The address the device used to reach Metro, from `hostUri` such as
 * `192.168.1.5:8081`. Present only when running against a dev server started
 * by @expo/cli.
 *
 * A tunnel host resolves but only proxies Metro's port, so it cannot reach
 * the API. Loopback is the simulator, and there the configured address is
 * already right — and on a USB-attached Android it is the only thing that
 * works, since only Metro's port gets reversed.
 */
export function devServerHostname(hostUri: string | undefined): string | null {
  const trimmed = hostUri?.trim()

  if (!trimmed) {
    return null
  }

  const [hostname] = trimmed.split(':')

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
 * path still come from the configured value, which stays the single place
 * the API's location is described.
 *
 * Anything unrecognised falls back to the configured value, so this can only
 * do as well as, or better than, hardcoding.
 */
export function resolveApiUrl(configured: string, hostname: string | null, dev: boolean): string {
  if (!dev || !hostname) {
    return configured
  }

  const parts = configured.match(URL_PARTS)

  if (!parts) {
    return configured
  }

  const [, scheme, port = '', path = ''] = parts

  return `${scheme}${hostname}${port}${path}`
}
