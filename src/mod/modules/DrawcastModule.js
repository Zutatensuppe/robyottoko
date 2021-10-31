import Db from '../../Db.ts'
import fn from '../../fn.ts'
import fs from 'fs'
import WebServer from '../../WebServer.js'
import WebSocketServer from '../../net/WebSocketServer.ts'
import Tokens from '../../services/Tokens.ts'
import TwitchHelixClient from '../../services/TwitchHelixClient.ts'
import Variables from '../../services/Variables.ts'

class DrawcastModule {
  constructor(
    /** @type Db */ db,
    user,
    /** @type Variables */ variables,
    chatClient,
    /** @type TwitchHelixClient */ helixClient,
    storage,
    cache,
    /** @type WebServer */ ws,
    /** @type WebSocketServer */ wss,
  ) {
    this.user = user
    this.variables = variables
    this.wss = wss
    this.storage = storage
    this.name = 'drawcast'

    this.ws = ws
    this.tokens = new Tokens(db)
    this.defaultSettings = {
      submitButtonText: 'Submit',
      submitConfirm: '', // leave empty to not require confirm
      canvasWidth: 720,
      canvasHeight: 405,
      customDescription: '',
      palette: [
        // row 1
        '#000000', '#808080', '#ff0000', '#ff8000', '#ffff00', '#00ff00',
        '#00ffff', '#0000ff', '#ff00ff', '#ff8080', '#80ff80',

        // row 2
        '#ffffff', '#c0c0c0', '#800000', '#804000', '#808000', '#008000',
        '#008080', '#000080', '#800080', '#8080ff', '#ffff80',
      ],
      displayDuration: 5000,
      displayLatestForever: false,
      displayLatestAutomatically: false,
      notificationSound: null,
      favorites: [],
    }
    this.reinit()

    this.images = this.loadAllImages().slice(0, 20)
  }

  loadAllImages() {
    try {
      // todo: probably better to store latest x images in db
      const rel = `/uploads/drawcast/${this.user.id}`
      const path = `./data${rel}`
      return fs.readdirSync(path)
        .map((name) => ({
          name: name,
          time: fs.statSync(path + '/' + name).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time)
        .map((v) => `${rel}/${v.name}`)
    } catch (e) {
      return []
    }
  }

  saveCommands(commands) {
    // pass
  }

  reinit() {
    const data = this.storage.load(this.name, {
      settings: this.defaultSettings
    })
    if (!data.settings.palette) {
      data.settings.palette = this.defaultSettings.palette
    }
    if (!data.settings.displayDuration) {
      data.settings.displayDuration = this.defaultSettings.displayDuration
    }
    if (!data.settings.notificationSound) {
      data.settings.notificationSound = this.defaultSettings.notificationSound
    }
    if (!data.settings.displayLatestForever) {
      data.settings.displayLatestForever = this.defaultSettings.displayLatestForever
    }
    if (!data.settings.displayLatestAutomatically) {
      data.settings.displayLatestAutomatically = this.defaultSettings.displayLatestAutomatically
    }
    if (!data.settings.favorites) {
      data.settings.favorites = []
    }
    this.data = data
  }

  widgets() {
    return {
      'drawcast_receive': async (req, res, next) => {
        res.render('widget.spy', {
          title: 'Drawcast Widget',
          page: 'drawcast_receive',
          wsUrl: `${this.wss.connectstring()}/${this.name}`,
          widgetToken: req.params.widget_token,
        })
      },
      'drawcast_draw': async (req, res, next) => {
        res.render('widget.spy', {
          title: 'Drawcast Widget',
          page: 'drawcast_draw',
          wsUrl: `${this.wss.connectstring()}/${this.name}`,
          widgetToken: req.params.widget_token,
        })
      },
    }
  }

  getRoutes() {
    return {
      get: {
        '/api/drawcast/all-images/': async (req, res, next) => {
          const images = this.loadAllImages()
          res.send(images)
        },
      },
    }
  }

  drawUrl() {
    const pubToken = this.tokens.getPubTokenForUserId(this.user.id).token
    return this.ws.pubUrl(this.ws.widgetUrl('drawcast_draw', pubToken))
  }

  wsdata(eventName) {
    return {
      event: eventName,
      data: Object.assign({}, this.data, {
        defaultSettings: this.defaultSettings,
        drawUrl: this.drawUrl(),
        images: this.images
      }),
    };
  }

  updateClient(eventName, ws) {
    this.wss.notifyOne([this.user.id], this.name, this.wsdata(eventName), ws)
  }

  updateClients(eventName) {
    this.wss.notifyAll([this.user.id], this.name, this.wsdata(eventName))
  }

  getWsEvents() {
    return {
      'conn': (ws) => {
        this.updateClient('init', ws)
      },
      'post': (ws, data) => {
        const rel = `/uploads/drawcast/${this.user.id}`
        const img = fn.decodeBase64Image(data.data.img)
        const name = `${(new Date()).toJSON()}-${fn.nonce(6)}.${fn.mimeToExt(img.type)}`
        const path = `./data${rel}`
        const imgpath = `${path}/${name}`
        const imgurl = `${rel}/${name}`
        fs.mkdirSync(path, { recursive: true })
        fs.writeFileSync(imgpath, img.data)
        this.images.unshift(imgurl)
        this.images = this.images.slice(0, 20)

        this.wss.notifyAll([this.user.id], this.name, {
          event: data.event,
          data: { img: imgurl },
        })
      },
      'save': (ws, { settings }) => {
        this.data.settings = settings
        this.storage.save(this.name, this.data)
        this.reinit()
        this.updateClients('init')
      },
    }
  }

  getCommands() {
    return {}
  }

  onChatMsg(client, target, context, msg) {
  }
}

export default DrawcastModule
