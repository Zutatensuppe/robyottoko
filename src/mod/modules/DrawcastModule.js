const Db = require('../../Db.js')
const fn = require('../../fn.js')
const fs = require('fs')
const WebServer = require('../../net/WebServer.js')
const WebSocketServer = require('../../net/WebSocketServer.js')
const Tokens = require('../../services/Tokens.js')
const TwitchHelixClient = require('../../services/TwitchHelixClient.js')

class DrawcastModule {
  constructor(
    /** @type Db */ db,
    user,
    chatClient,
    /** @type TwitchHelixClient */ helixClient,
    storage,
    cache,
    /** @type WebServer */ ws,
    /** @type WebSocketServer */ wss,
  ) {
    this.user = user
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
      notificationSound: null,
    }
    this.reinit()

    try {
      // todo: probably better to store latest x images in db
      const rel = `/uploads/drawcast/${this.user.id}`
      const path = `./data${rel}`
      this.images = fs.readdirSync(path)
        .map((name) => ({
          name: name,
          time: fs.statSync(path + '/' + name).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time)
        .map((v) => `${rel}/${v.name}`)
        .slice(0, 20)
    } catch (e) {
      this.images = []
    }
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
    this.data = data
  }

  widgets() {
    return {
      'drawcast_receive': async (req, res, next) => {
        res.send(await fn.render('widget.twig', {
          title: 'Drawcast Widget',
          page: 'drawcast_receive',
          page_data: {
            wsBase: this.wss.connectstring(),
            widgetToken: req.params.widget_token,
          },
        }))
      },
      'drawcast_draw': async (req, res, next) => {
        res.send(await fn.render('widget.twig', {
          title: 'Drawcast Widget',
          page: 'drawcast_draw',
          page_data: {
            wsBase: this.wss.connectstring(),
            widgetToken: req.params.widget_token,
          },
        }))
      },
    }
  }

  getRoutes() {
    return {
      '/drawcast/': async (req, res, next) => {
        res.send(await fn.render('base.twig', {
          title: 'Drawcast',
          page: 'drawcast',
          page_data: {
            wsBase: this.wss.connectstring(),
            widgetToken: req.userWidgetToken,
            user: req.user,
            token: req.cookies['x-token'],
          },
        }))
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

module.exports = DrawcastModule
