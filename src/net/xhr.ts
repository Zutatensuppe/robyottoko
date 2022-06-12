import fetch, { RequestInit } from 'node-fetch'

type RequestMethod = 'get' | 'post' | 'get' | 'delete' | 'patch' | 'put'

export type QueryArgsData = Record<string, string | number>

export function withHeaders(headers: Record<string, string>, opts: RequestInit = {}) {
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

export function asQueryArgs(data: QueryArgsData) {
  const q = []
  for (const k in data) {
    const pair = [k, data[k]].map(encodeURIComponent)
    q.push(pair.join('='))
  }
  if (q.length === 0) {
    return ''
  }
  return `?${q.join('&')}`
}

export async function request(method: RequestMethod, url: string, opts: RequestInit = {}) {
  const options = opts || {}
  options.method = method
  return await fetch(url, options)
}

export default {
  withHeaders,
  asJson,
  asQueryArgs,
  request,
}
