interface RequestOptions {
  headers?: Record<string, string>
  body?: XMLHttpRequestBodyInit,
  onUploadProgress?: (ev: ProgressEvent<XMLHttpRequestEventTarget>) => void,
}

export interface Response {
  status: number
  text: string
  json: () => Promise<any>
}

export const JSON_HEADERS = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
}

export const request = async (method: string, url: string, options: RequestOptions): Promise<Response> => {
  return new Promise((resolve, reject) => {
    const xhr = new window.XMLHttpRequest()
    xhr.open(method, url, true)
    xhr.withCredentials = true
    const headers = options.headers || {}
    for (const k in headers) {
      xhr.setRequestHeader(k, headers[k])
    }
    xhr.addEventListener('load', function (_ev) {
      resolve({
        status: this.status,
        text: this.responseText,
        json: async () => JSON.parse(this.responseText),
      })
    })
    xhr.addEventListener('error', function (_ev) {
      reject(new Error('xhr error'))
    })
    if (xhr.upload && options.onUploadProgress) {
      xhr.upload.addEventListener('progress', function (ev) {
        // typescript complains without this extra check
        if (options.onUploadProgress) {
          options.onUploadProgress(ev)
        }
      })
    }
    xhr.send(options.body)
  })
}
export const get = async (url: string, options: RequestOptions = {}) => request('get', url, options)
export const post = async (url: string, options: RequestOptions = {}) => request('post', url, options)
export const postJsonStr = async (url: string, jsonStr: string) => request('post', url, {
  headers: JSON_HEADERS,
  body: jsonStr,
})
export const postJson = async (url: string, data: any) => postJsonStr(url, JSON.stringify(data))