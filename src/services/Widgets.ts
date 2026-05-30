import { nonce } from '../common/fn'
import type { WidgetDefinition, WidgetInfo} from '../types'
import { MODULE_NAME, WIDGET_PATH_PREFIX, WIDGET_TOKEN_PREFIX, WIDGET_TYPE, WIDGET_WS_PATH_PREFIX } from '../enums'
import type { Repos } from '../repo/Repos'

const widgets: WidgetDefinition[] = [
  {
    type: WIDGET_TYPE.SR,
    module: MODULE_NAME.SR,
    title: 'Song Request',
    hint: 'Browser source, or open in browser and capture window',
    pub: false,
  },
  {
    type: WIDGET_TYPE.MEDIA,
    module: MODULE_NAME.GENERAL,
    title: 'Media',
    hint: 'Browser source, or open in browser and capture window',
    pub: false,
  },
  {
    type: WIDGET_TYPE.MEDIA_V2,
    module: MODULE_NAME.GENERAL,
    title: 'Media V2',
    hint: 'Browser source, or open in browser and capture window',
    pub: false,
  },
  {
    type: WIDGET_TYPE.EMOTE_WALL,
    module: MODULE_NAME.GENERAL,
    title: 'Emote Wall',
    hint: 'Browser source, or open in browser and capture window',
    pub: false,
  },
  {
    type: WIDGET_TYPE.SPEECH_TO_TEXT_CONTROL,
    module: MODULE_NAME.SPEECH_TO_TEXT,
    title: 'Speech-to-Text',
    hint: 'Google Chrome + window capture',
    pub: false,
  },
  {
    type: WIDGET_TYPE.SPEECH_TO_TEXT_RECEIVE,
    module: MODULE_NAME.SPEECH_TO_TEXT,
    title: 'Speech-to-Text (receive)',
    hint: 'Browser source, or open in browser and capture window',
    pub: false,
  },
  {
    type: WIDGET_TYPE.AVATAR_CONTROL,
    module: MODULE_NAME.AVATAR,
    title: 'Avatar (control)',
    hint: '???',
    pub: false,
  },
  {
    type: WIDGET_TYPE.AVATAR_RECEIVE,
    module: MODULE_NAME.AVATAR,
    title: 'Avatar (receive)',
    hint: 'Browser source, or open in browser and capture window',
    pub: false,
  },
  {
    type: WIDGET_TYPE.DRAWCAST_RECEIVE,
    module: MODULE_NAME.DRAWCAST,
    title: 'Drawcast (Overlay)',
    hint: 'Browser source, or open in browser and capture window',
    pub: false,
  },
  {
    type: WIDGET_TYPE.DRAWCAST_DRAW,
    module: MODULE_NAME.DRAWCAST,
    title: 'Drawcast (Draw)',
    hint: 'Open this to draw (or give to viewers to let them draw)',
    pub: true,
  },
  {
    type: WIDGET_TYPE.DRAWCAST_CONTROL,
    module: MODULE_NAME.DRAWCAST,
    title: 'Drawcast (Control)',
    hint: 'Open this to control certain actions of draw (for example permit drawings)',
    pub: false,
  },
  {
    type: WIDGET_TYPE.POMO,
    module: MODULE_NAME.POMO,
    title: 'Pomo',
    hint: 'Browser source, or open in browser and capture window',
    pub: false,
  },
  {
    type: WIDGET_TYPE.ROULETTE,
    module: MODULE_NAME.GENERAL,
    title: 'Roulette',
    hint: 'Browser source, or open in browser and capture window',
    pub: false,
  },
]

class Widgets {
  constructor(
    private readonly repos: Repos,
    private readonly baseUrl: string,
  ) {
    // pass
  }

  private _widgetPath(type: string, token: string): string {
    return `${WIDGET_PATH_PREFIX}/${type}/${token}/`
  }

  private _absoluteUrl(path: string): string {
    return `${this.baseUrl}${path}`
  }

  private _getTokenType(type: string): string {
    return `${WIDGET_TOKEN_PREFIX}${type}`
  }

  public getModuleTypeByWsPath(wsPath: string): string | null {
    const widgetPrefix = WIDGET_WS_PATH_PREFIX
    const widgetType = wsPath.startsWith(widgetPrefix) ? wsPath.substring(widgetPrefix.length) : ''
    const found = widgets.find((w) => w.type === widgetType)
    return found ? found.module : null
  }

  private async _getWidgetToken(type: string, userId: number): Promise<string | null> {
    const tokenRow = await this.repos.token.getByUserIdAndType(userId, this._getTokenType(type))
    return tokenRow ? tokenRow.token : null
  }

  private async _createWidgetToken(type: string, userId: number): Promise<string> {
    const tokenRow = await this.repos.token.createToken(userId, this._getTokenType(type))
    return tokenRow.token
  }

  private async _ensureWidgetPath(type: string, userId: number): Promise<string> {
    const token = await this._getWidgetToken(type, userId)
    if (token) {
      return this._widgetPath(type, token)
    }
    const newToken = await this._createWidgetToken(type, userId)
    return this._widgetPath(type, newToken)
  }

  private async _resetWidgetPath(type: string, userId: number): Promise<string> {
    const token = await this._getWidgetToken(type, userId)
    if (token) {
      await this.repos.token.delete(token)
    }
    const newToken = await this._createWidgetToken(type, userId)
    return this._widgetPath(type, newToken)
  }

  private async _pubPath(widgetPath: string): Promise<string> {
    const row = await this.repos.pub.getByTarget(widgetPath)
    let id
    if (!row) {
      do {
        id = nonce(6)
      } while (await this.repos.pub.getById(id))
      await this.repos.pub.insert({ id, target: widgetPath })
    } else {
      id = row.id
    }
    return `/pub/${id}`
  }

  public async createWidgetUrl(type: string, userId: number, pub: boolean): Promise<string> {
    const path = await this._resetWidgetPath(type, userId)
    return this._absoluteUrl(pub ? await this._pubPath(path) : path)
  }

  public async getWidgetUrl(widgetType: WIDGET_TYPE, userId: number): Promise<string> {
    const path = await this._ensureWidgetPath(widgetType, userId)
    return this._absoluteUrl(path)
  }

  public async getPublicWidgetUrl(widgetType: WIDGET_TYPE, userId: number): Promise<string> {
    const path = await this._ensureWidgetPath(widgetType, userId)
    return this._absoluteUrl(await this._pubPath(path))
  }

  public async getWidgetInfos(userId: number): Promise<WidgetInfo[]> {
    const widgetInfos = []
    for (const w of widgets) {
      const path = await this._ensureWidgetPath(w.type, userId)
      widgetInfos.push({
        type: w.type,
        module: w.module,
        pub: w.pub,
        title: w.title,
        hint: w.hint,
        url: this._absoluteUrl(w.pub ? await this._pubPath(path) : path),
      })
    }
    return widgetInfos
  }

  public getWidgetDefinitionByType(type: string): WidgetDefinition | null {
    return widgets.find(w => w.type === type) || null
  }
}

export default Widgets
