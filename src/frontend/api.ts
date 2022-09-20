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
const get = async (url: string, options: RequestOptions = {}) => request('get', url, options)
const post = async (url: string, options: RequestOptions = {}) => request('post', url, options)


const postJsonStr = async (url: string, jsonStr: string) => request('post', url, {
  headers: { Accept: "application/json", "Content-Type": "application/json" },
  body: jsonStr,
})
const postJson = async (url: string, data: any) => postJsonStr(url, JSON.stringify(data))


type QueryArgsData = Record<string, string | number>
function asQueryArgs(data: QueryArgsData) {
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

export default {
  resendVerificationMail: async (data: { email: string }) => postJson("/api/user/_resend_verification_mail", data),
  requestPasswordReset: async (data: { email: string }) => postJson("/api/user/_request_password_reset", data),
  register: async (data: { user: string, pass: string, email: string }) => postJson("/api/user/_register", data),
  resetPassword: async (data: { pass: string, token: string | null }) => postJson("/api/user/_reset_password", data),
  handleToken: async (data: { token: string }) => postJson("/api/_handle-token", data),
  saveVariables: async (data: { variables: any }) => postJson("/api/save-variables", data),
  twitchUserIdByName: async (data: { name: string, client_id: string | null, client_secret: string | null }) => postJson("/api/twitch/user-id-by-name", data),
  saveUserSettings: async (data: { user: any, twitch_channels: any[] }) => postJson("/api/save-settings", data),
  getPageVariablesData: async () => get("/api/page/variables"),
  getPageIndexData: async () => get("/api/page/index"),
  getPageSettingsData: async () => get("/api/page/settings"),
  getDataGlobal: async () => get("/api/data/global"),
  getMe: async () => get("/api/user/me"),
  logout: async () => post("/api/logout"),
  login: async (data: { user: string, pass: string }) => postJson("/api/auth", data),
  getConf: async () => get("/api/conf"),
  upload: async (file: File, onUploadProgress: (evt: ProgressEvent<XMLHttpRequestEventTarget>) => void) => {
    const body = new FormData();
    body.append("file", file, file.name);
    return request('post', "/api/upload", { body, onUploadProgress });
  },
  importPlaylist: async (playlistJsonString: string) => postJsonStr("/api/sr/import", playlistJsonString),
  getDrawcastAllImages: async () => get("/api/drawcast/all-images/"),
  getGeneralGlobalEmotes: async () => get("/api/general/global-emotes"),
  getGeneralChannelEmotes: async (channelName: string) => get("/api/general/channel-emotes" + asQueryArgs({ channel_name: channelName })),
  createWidgetUrl: async (data: { type: string, pub: boolean }) => postJson("/api/widget/create_url", data),
  getWidgetData: async (widgetType: string, widgetToken: string) => get(`/api/widget/${widgetType}/${widgetToken}/`),
  getPubData: async (pubId: string) => get(`/api/pub/${pubId}`),
}
