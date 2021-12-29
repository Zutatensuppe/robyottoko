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

const request = async (method: string, url: string, options: RequestOptions): Promise<Response> => {
  return new Promise((resolve, reject) => {
    const xhr = new window.XMLHttpRequest()
    xhr.open(method, url, true)
    xhr.withCredentials = true
    const headers = options.headers || {}
    for (const k in headers) {
      xhr.setRequestHeader(k, headers[k])
    }
    xhr.addEventListener('load', function (ev) {
      resolve({
        status: this.status,
        text: this.responseText,
        json: async () => JSON.parse(this.responseText),
      })
    })
    xhr.addEventListener('error', function (ev) {
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

export default {
  request,
  get: (url: string, options: RequestOptions) => request('get', url, options),
  post: (url: string, options: RequestOptions) => request('post', url, options),
}
