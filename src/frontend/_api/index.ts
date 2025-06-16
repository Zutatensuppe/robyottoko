import { asQueryArgs } from '../../common/fn'
import { get, post, postJson, postJsonStr, request } from './xhr'

export default {
  saveVariables: async (data: { variables: any }) => postJson('/api/save-variables', data),
  saveUserSettings: async (data: { user: any }) => postJson('/api/save-settings', data),
  getPageVariablesData: async () => get('/api/page/variables'),
  getPageIndexData: async () => get('/api/page/index'),
  getPageSettingsData: async () => get('/api/page/settings'),
  getDataGlobal: async () => get('/api/data/global'),
  getMe: async () => get('/api/user/me'),
  logout: async () => post('/api/logout'),
  getConf: async () => get('/api/conf'),
  upload: async (file: File, onUploadProgress: (evt: ProgressEvent<XMLHttpRequestEventTarget>) => void) => {
    const body = new FormData()
    body.append('file', file, file.name)
    return request('post', '/api/upload', { body, onUploadProgress })
  },
  importPlaylist: async (playlistJsonString: string) => postJsonStr('/api/sr/import', playlistJsonString),
  getGeneralGlobalEmotes: async () => get('/api/general/global-emotes'),
  getGeneralChannelEmotes: async (channelName: string) => get('/api/general/channel-emotes' + asQueryArgs({ channel_name: channelName })),
  getExtractedEmotes: async (emotesInput: string, channel: string) => get('/api/general/extract-emotes' + asQueryArgs({ emotesInput, channel })),
  createWidgetUrl: async (data: { type: string, pub: boolean }) => postJson('/api/widget/create_url', data),
  setModuleEnabled: async (data: { key: string, enabled: boolean }) => postJson('/api/modules/_set_enabled', data),
  getWidgetData: async (widgetType: string, widgetToken: string) => get(`/api/widget/${widgetType}/${widgetToken}/`),
  getPubData: async (pubId: string) => get(`/api/pub/${pubId}`),
}
