const _request = async (url: string, opts: any) => fetch(url, opts)

const _get = async (url: string) => _request(url, undefined)
const _post = async (url: string, data: any) => _request(url, {
  method: "post", headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  }, body: JSON.stringify(data)
})

export default {
  resendVerificationMail: async (data: { email: string }) => _post("/api/user/_resend_verification_mail", data),
  requestPasswordReset: async (data: { email: string }) => _post("/api/user/_request_password_reset", data),
  register: async (data: { user: string, pass: string, email: string }) => _post("/api/user/_register", data),
  resetPassword: async (data: { pass: string, token: string | null }) => _post("/api/user/_reset_password", data),
  handleToken: async (data: { token: string }) => _post("/api/_handle-token", data),
  saveVariables: async (data: { variables: any }) => _post("/api/save-variables", data),
  twitchUserIdByName: async (data: { name: string, client_id: string | null, client_secret: string | null }) => _post("/api/twitch/user-id-by-name", data),
  saveUserSettings: async (data: { user: any, twitch_channels: any[] }) => _post("/api/save-settings", data),
  getPageVariablesData: async () => _get("/api/page/variables"),
  getPageIndexData: async () => _get("/api/page/index"),
  getPageSettingsData: async () => _get("/api/page/settings"),
  getMe: async () => _get("/api/user/me"),
  logout: async () => _post("/api/logout", {}),
  login: async (data: { user: string, pass: string }) => _post("/api/auth", data),
  getConf: async () => _get("/api/conf"),
}
