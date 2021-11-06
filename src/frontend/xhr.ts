interface RequestOptions {
  headers: Record<string, string>
  body: XMLHttpRequestBodyInit,
  onUploadProgress?: (ev: ProgressEvent<XMLHttpRequestEventTarget>) => void,
}

const request = async (method: string, url: string, options: RequestOptions) => {
  return new Promise((resolve, reject) => {
    const xhr = new window.XMLHttpRequest()
    xhr.open(method, url, true)
    xhr.withCredentials = true
    for (const k in options.headers || {}) {
      xhr.setRequestHeader(k, options.headers[k])
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
