const fetch = require('node-fetch')

function withHeaders(headers, opts = {}) {
  const options = opts || {}
  options.headers = options.headers || {}
  for (let k in headers) {
    options.headers[k] = headers[k]
  }
  return options
}

function asJson(data) {
  return {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }
}

function asQueryArgs(data) {
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

async function request(method, url, opts = {}) {
  const options = opts || {}
  options.method = method
  return await fetch(url, options)
}

async function requestJson(method, url, opts = {}) {
  const resp = await request(method, url, opts)
  return await resp.json()
}

async function requestText(method, url, opts = {}) {
  const resp = await request(method, url, opts)
  return await resp.text()
}

async function getText(url, opts = {}) {
  return await requestText('get', url, opts)
}

async function postJson(url, opts = {}) {
  return await requestJson('post', url, opts)
}

async function getJson(url, opts = {}) {
  return await requestJson('get', url, opts)
}

async function delJson(url, opts = {}) {
  return await requestJson('delete', url, opts)
}

module.exports = {
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
