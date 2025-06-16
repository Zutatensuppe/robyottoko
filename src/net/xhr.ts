import type { RequestInit, Response } from 'node-fetch'
import fetch from 'node-fetch'

type RequestMethod = 'get' | 'post' | 'delete' | 'patch' | 'put'

// https://stackoverflow.com/a/59854446/392905
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), ms))
const retryFetch = async (
  url: string,
  opts: RequestInit,
  retries: number = 3,
  retryDelay: number = 1000,
  timeout: number = 0,
): Promise<Response> => {
  return new Promise<Response>((resolve, reject) => {
    if (timeout) {
      setTimeout(() => reject('error: timeout'), timeout)
    }
    const wrapper = (n: number) => {
      fetch(url, opts)
        .then((res) => resolve(res))
        .catch(async (err) => {
          if (n > 0) {
            await delay(retryDelay)
            wrapper(--n)
          } else {
            reject(err)
          }
        })
    }
    wrapper(retries)
  })
}

export function withHeaders(
  headers: Record<string, string>,
  opts: RequestInit = {},
) {
  const options = opts || {}
  options.headers = (options.headers || {}) as Record<string, string>
  for (const k in headers) {
    options.headers[k] = headers[k]
  }
  return options
}

export function asJson(data: any): RequestInit {
  return {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }
}

const request = async (method: RequestMethod, url: string, opts: RequestInit = {}) => {
  const options = opts || {}
  options.method = method
  return await retryFetch(url, options)
}

export default {
  withHeaders,
  asJson,
  get: async (url: string, opts: RequestInit = {}) => request('get', url, opts),
  post: async (url: string, opts: RequestInit = {}) => request('post', url, opts),
  delete: async (url: string, opts: RequestInit = {}) => request('delete', url, opts),
  patch: async (url: string, opts: RequestInit = {}) => request('patch', url, opts),
  put: async (url: string, opts: RequestInit = {}) => request('put', url, opts),
}
