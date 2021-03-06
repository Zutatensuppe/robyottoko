const config = require('../../config.js')
const fetch = require('node-fetch')
const fn = require('../../fn.js')

class SpeechToTextModule {
  constructor(db, user, client, storage, cache, ws, wss) {
    this.db = db
    this.user = user
    this.client = client
    this.storage = storage
    this.cache = cache
    this.ws = ws
    this.wss = wss
    this.name = 'speech-to-text'
    this.defaultSettings = {
      status: {
        enabled: false,
      },
      styles: {
        // page background color
        bgColor: '#ff00ff',
        // vertical align of text
        vAlign: 'bottom', // top|bottom

        // recognized text
        recognition: {
          fontFamily: 'sans-serif',
          fontSize: '30',
          fontWeight: '400',
          strokeWidth: '8',
          strokeColor: '#292929',
          color: '#ffff00',
        },

        // translated text
        translation: {
          fontFamily: 'sans-serif',
          fontSize: '30',
          fontWeight: '400',
          strokeWidth: '8',
          strokeColor: '#292929',
          color: '#cbcbcb',
        }
      },
      recognition: {
        display: true,
        lang: 'ja',
        synthesize: false,
      },
      translation: {
        enabled: true,
        langSrc: 'ja',
        langDst: 'en',
        synthesize: false,
      },
    }
    this.reinit()
  }

  reinit () {
    this.data = this.storage.load(this.name, {
      settings: this.defaultSettings
    })
  }

  widgets () {
    return {
      'speech-to-text': async (req, res, next) => {
        res.send(await fn.render('widget.twig', {
          title: 'Speech to Text Widget',
          page: 'speech-to-text',
          page_data: {
            wsBase: config.ws.connectstring,
            widgetToken: req.params.widget_token,
          },
        }))
      },
    }
  }

  getRoutes () {
    return {
      '/speech-to-text/': async (req, res, next) => {
        res.send(await fn.render('base.twig', {
          title: 'Speech to text',
          page: 'speech-to-text',
          page_data: {
            wsBase: config.ws.connectstring,
            widgetToken: req.userWidgetToken,
            user: req.user,
            token: req.cookies['x-token'],
          },
        }))
      },
    }
  }

  wsdata (eventName) {
    return {
      event: eventName,
      data: Object.assign({}, this.data, {defaultSettings: this.defaultSettings}),
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
      'translate': async (ws, {text, src, dst}) => {
        const scriptId = config.modules.speechToText.google.scriptId
        const query = `https://script.google.com/macros/s/${scriptId}/exec`
          + '?text=' + encodeURIComponent(text)
          + '&source=' + src
          + '&target=' + dst
        const res = await fetch(query)
        this.wss.notifyOne([this.user.id], this.name, {event: 'translated', data: {
          in: text,
          out: await res.text(),
        }}, ws)
      },
      'conn': (ws) => {
        this.updateClient('init', ws)
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

module.exports = SpeechToTextModule
