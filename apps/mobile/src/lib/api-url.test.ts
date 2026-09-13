import { describe, expect, test } from 'bun:test'
import { devServerHostname, resolveApiUrl } from './api-url'

describe('devServerHostname', () => {
  test('takes the LAN address the device reached Metro on', () => {
    expect(devServerHostname('192.168.1.5:8081')).toBe('192.168.1.5')
    expect(devServerHostname(' 10.0.0.2:8081 ')).toBe('10.0.0.2')
  })

  test.each([
    ['127.0.0.1:8081', 'loopback is the simulator'],
    ['localhost:8081', 'a name is not a LAN address'],
    ['abc-123.exp.direct:80', 'a tunnel only proxies Metro'],
    ['', 'nothing reported'],
    [undefined, 'not running under the dev server'],
  ])('%p is rejected (%s)', (hostUri) => {
    expect(devServerHostname(hostUri)).toBeNull()
  })
})

describe('resolveApiUrl', () => {
  const configured = 'http://localhost:3000/base'

  test('swaps only the host, keeping scheme, port and path', () => {
    expect(resolveApiUrl(configured, '192.168.1.5', true)).toBe('http://192.168.1.5:3000/base')
    expect(resolveApiUrl('https://api.example', '192.168.1.5', true)).toBe('https://192.168.1.5')
    expect(resolveApiUrl('http://[::1]:3000', '192.168.1.5', true)).toBe('http://192.168.1.5:3000')
  })

  test('leaves the configured value alone outside development or without a host', () => {
    expect(resolveApiUrl(configured, '192.168.1.5', false)).toBe(configured)
    expect(resolveApiUrl(configured, null, true)).toBe(configured)
  })

  test('leaves a value it cannot take apart alone', () => {
    expect(resolveApiUrl('not a url', '192.168.1.5', true)).toBe('not a url')
  })
})
