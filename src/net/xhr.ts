import fetch, { RequestInit } from 'node-fetch'

type RequestMethod = 'get' | 'post' | 'delete' | 'patch' | 'put'

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

const request = async (method: RequestMethod, url: string, opts: RequestInit = {}) => {
  const options = opts || {}
  options.method = method
  return await fetch(url, options)
}

export default {
  withHeaders,
  asJson,
  asQueryArgs,
  get: async (url: string, opts: RequestInit = {}) => request('get', url, opts),
  post: async (url: string, opts: RequestInit = {}) => request('post', url, opts),
  delete: async (url: string, opts: RequestInit = {}) => request('delete', url, opts),
  patch: async (url: string, opts: RequestInit = {}) => request('patch', url, opts),
  put: async (url: string, opts: RequestInit = {}) => request('put', url, opts),
}
