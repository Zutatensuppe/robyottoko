import { nonce } from "../common/fn"
import Db from "../DbPostgres"
import { MODULE_NAME, WIDGET_TYPE } from "../types"
import Tokens from "./Tokens"

interface WidgetDefinition {
  type: WIDGET_TYPE
  module: MODULE_NAME
  title: string
  hint: string
  pub: boolean
}

interface WidgetInfo extends WidgetDefinition {
  url: string
}

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
]

export const moduleByWidgetType = (widgetType: string): string | null => {
  const found = widgets.find((w) => w.type === widgetType)
  return found ? found.module : null
}

class Widgets {
  private db: Db
  private tokenRepo: Tokens

  constructor(db: Db, tokenRepo: Tokens) {
    this.db = db
    this.tokenRepo = tokenRepo
  }

  _widgetUrl = (type: string, token: string): string => {
    return `/widget/${type}/${token}/`
  }

  async createWidgetUrl(type: string, userId: number): Promise<string> {
    let t = await this.tokenRepo.getByUserIdAndType(userId, `widget_${type}`)
    if (t) {
      await this.tokenRepo.delete(t.token)
    }
    t = await this.tokenRepo.createToken(userId, `widget_${type}`)
    return this._widgetUrl(type, t.token)
  }

  async widgetUrlByTypeAndUserId(
    type: WIDGET_TYPE,
    userId: number,
  ): Promise<string> {
    const t = await this.tokenRepo.getByUserIdAndType(userId, `widget_${type}`)
    if (t) {
      return this._widgetUrl(type, t.token)
    }
    return await this.createWidgetUrl(type, userId)
  }

  async pubUrl(target: string): Promise<string> {
    const row = await this.db.get('robyottoko.pub', { target })
    let id
    if (!row) {
      do {
        id = nonce(6)
      } while (await this.db.get('robyottoko.pub', { id }))
      await this.db.insert('robyottoko.pub', { id, target })
    } else {
      id = row.id
    }
    return `/pub/${id}`
  }

  async getWidgetUrl(widgetType: WIDGET_TYPE, userId: number): Promise<string> {
    return await this.widgetUrlByTypeAndUserId(widgetType, userId)
  }

  async getPublicWidgetUrl(widgetType: WIDGET_TYPE, userId: number): Promise<string> {
    const url = await this.widgetUrlByTypeAndUserId(widgetType, userId)
    return await this.pubUrl(url)
  }

  async getWidgetInfos(userId: number): Promise<WidgetInfo[]> {
    const widgetInfos = []
    for (const w of widgets) {
      const url = await this.widgetUrlByTypeAndUserId(w.type, userId)
      widgetInfos.push({
        type: w.type,
        module: w.module,
        pub: w.pub,
        title: w.title,
        hint: w.hint,
        url: w.pub ? (await this.pubUrl(url)) : url,
      })
    }
    return widgetInfos
  }

  getWidgetDefinitionByType(type: string): WidgetDefinition | null {
    return widgets.find(w => w.type === type) || null
  }
}

export default Widgets
