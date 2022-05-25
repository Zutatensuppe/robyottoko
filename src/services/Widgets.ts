import { nonce } from "../common/fn"
import Db from "../DbPostgres"
import Tokens from "./Tokens"

interface WidgetDefinition {
  type: string
  title: string
  hint: string
  pub: boolean
}

interface WidgetInfo extends WidgetDefinition {
  url: string
}

const widgets: WidgetDefinition[] = [
  {
    type: 'sr',
    title: 'Song Request',
    hint: 'Browser source, or open in browser and capture window',
    pub: false,
  },
  {
    type: 'media',
    title: 'Media',
    hint: 'Browser source, or open in browser and capture window',
    pub: false,
  },
  {
    type: 'speech-to-text',
    title: 'Speech-to-Text',
    hint: 'Google Chrome + window capture',
    pub: false,
  },
  {
    type: 'speech-to-text_receive',
    title: 'Speech-to-Text (receive)',
    hint: 'Browser source, or open in browser and capture window',
    pub: false,
  },
  {
    type: 'avatar',
    title: 'Avatar (control)',
    hint: '???',
    pub: false,
  },
  {
    type: 'avatar_receive',
    title: 'Avatar (receive)',
    hint: 'Browser source, or open in browser and capture window',
    pub: false,
  },
  {
    type: 'drawcast_receive',
    title: 'Drawcast (Overlay)',
    hint: 'Browser source, or open in browser and capture window',
    pub: false,
  },
  {
    type: 'drawcast_draw',
    title: 'Drawcast (Draw)',
    hint: 'Open this to draw (or give to viewers to let them draw)',
    pub: true,
  },
  {
    type: 'drawcast_control',
    title: 'Drawcast (Control)',
    hint: 'Open this to control certain actions of draw (for example permit drawings)',
    pub: false,
  },
  {
    type: 'pomo',
    title: 'Pomo',
    hint: 'Browser source, or open in browser and capture window',
    pub: false,
  },
]

class Widgets {
  private base: string
  private db: Db
  private tokenRepo: Tokens

  constructor(base: string, db: Db, tokenRepo: Tokens) {
    this.base = base
    this.db = db
    this.tokenRepo = tokenRepo
  }

  _widgetUrl = (type: string, token: string): string => {
    return `${this.base}/widget/${type}/${token}/`
  }

  async createWidgetUrl(type: string, userId: number): Promise<string> {
    let t = await this.tokenRepo.getByUserIdAndType(userId, `widget_${type}`)
    if (t) {
      await this.tokenRepo.delete(t.token)
    }
    t = await this.tokenRepo.createToken(userId, `widget_${type}`)
    return this._widgetUrl(type, t.token)
  }

  async widgetUrlByTypeAndUserId(type: string, userId: number): Promise<string> {
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
    return `${this.base}/pub/${id}`
  }

  async getWidgetUrl(widgetType: string, userId: number): Promise<string> {
    return await this.widgetUrlByTypeAndUserId(widgetType, userId)
  }

  async getPublicWidgetUrl(widgetType: string, userId: number): Promise<string> {
    const url = await this.widgetUrlByTypeAndUserId(widgetType, userId)
    return await this.pubUrl(url)
  }

  async getWidgetInfos(userId: number): Promise<WidgetInfo[]> {
    const widgetInfos = []
    for (const w of widgets) {
      const url = await this.widgetUrlByTypeAndUserId(w.type, userId)
      widgetInfos.push({
        type: w.type,
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
