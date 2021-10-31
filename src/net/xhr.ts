import fetch, { RequestInit } from 'node-fetch'

type RequestMethod = 'get' | 'post' | 'get' | 'delete'

export function withHeaders(headers: Record<string, string>, opts: RequestInit = {}) {
  const options = opts || {}
  options.headers = (options.headers || {}) as Record<string, string>
  for (let k in headers) {
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

export function asQueryArgs(data: Record<string, string | number>) {
  const q = []
  for (let k in data) {
    const pair = [k, data[k]].map(encodeURIComponent)
    q.push(pair.join('='))
  }
  if (q.length === 0) {
    return ''
  }
  return `?${q.join('&')}`
}

async function request(method: RequestMethod, url: string, opts: RequestInit = {}) {
  const options = opts || {}
  options.method = method
  return await fetch(url, options)
}

export async function requestJson(method: RequestMethod, url: string, opts: RequestInit = {}) {
  const resp = await request(method, url, opts)
  return await resp.json()
}

export async function requestText(method: RequestMethod, url: string, opts: RequestInit = {}) {
  const resp = await request(method, url, opts)
  return await resp.text()
}

export async function getText(url: string, opts: RequestInit = {}) {
  return await requestText('get', url, opts)
}

export async function postJson(url: string, opts: RequestInit = {}) {
  return await requestJson('post', url, opts)
}

export async function getJson(url: string, opts: RequestInit = {}) {
  return await requestJson('get', url, opts)
}

export async function delJson(url: string, opts: RequestInit = {}) {
  return await requestJson('delete', url, opts)
}

export default {
  withHeaders,
  asJson,
  asQueryArgs,
  request,
  requestJson,
  requestText,
  getText,
  postJson,
  getJson,
  delJson,
}
