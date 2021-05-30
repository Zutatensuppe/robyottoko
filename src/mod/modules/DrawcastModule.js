const Db = require('../../Db.js')
const fn = require('../../fn.js')
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
    }
    this.reinit()
  }

  reinit () {
    const data = this.storage.load(this.name, {
      settings: this.defaultSettings
    })
    if (!data.settings.palette) {
      data.settings.palette = this.defaultSettings.palette
    }
    this.data = data
  }

  widgets () {
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

  getRoutes () {
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

  drawUrl () {
    const pubToken = this.tokens.getPubTokenForUserId(this.user.id).token
    return this.ws.pubUrl(this.ws.widgetUrl('drawcast_draw', pubToken))
  }

  wsdata (eventName) {
    return {
      event: eventName,
      data: Object.assign({}, this.data, {
        defaultSettings: this.defaultSettings,
        drawUrl: this.drawUrl(),
      }),
    };
  }

  updateClient (eventName, ws) {
    this.wss.notifyOne([this.user.id], this.name, this.wsdata(eventName), ws)
  }

  updateClients (eventName) {
    this.wss.notifyAll([this.user.id], this.name, this.wsdata(eventName))
  }

  getWsEvents () {
    return {
      'conn': (ws) => {
        this.updateClient('init', ws)
      },
      'post': (ws, data) => {
        this.wss.notifyAll([this.user.id], this.name, data)
      },
      'save': (ws, {settings}) => {
        this.data.settings = settings
        this.storage.save(this.name, this.data)
        this.reinit()
        this.updateClients('init')
      },
    }
  }

  getCommands () {
    return {}
  }

  onChatMsg (client, target, context, msg) {
  }
}

module.exports = DrawcastModule
