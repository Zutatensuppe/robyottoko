import config from '../../config.ts'
import fn from '../../fn.js'
import { getText, asQueryArgs } from '../../net/xhr.ts'

class SpeechToTextModule {
  constructor(db, user, variables, chatClient, helixClient, storage, cache, ws, wss) {
    this.db = db
    this.user = user
    this.variables = variables
    this.client = chatClient
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
        synthesizeLang: '',
      },
      translation: {
        enabled: true,
        langSrc: 'ja',
        langDst: 'en',
        synthesize: false,
        synthesizeLang: '',
      },
    }
    this.reinit()
  }

  reinit() {
    this.data = this.storage.load(this.name, {
      settings: this.defaultSettings
    })
  }

  saveCommands(commands) {
    // pass
  }

  widgets() {
    return {
      'speech-to-text': async (req, res, next) => {
        res.send(await fn.render('widget.twig', {
          title: 'Speech to Text Widget',
          page: 'speech-to-text',
          wsUrl: `${this.wss.connectstring()}/${this.name}`,
          widgetToken: req.params.widget_token,
        }))
      },
    }
  }

  getRoutes() {
    return {}
  }

  wsdata(eventName) {
    return {
      event: eventName,
      data: Object.assign({}, this.data, { defaultSettings: this.defaultSettings }),
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
      'translate': async (ws, { text, src, dst }) => {
        const scriptId = config.modules.speechToText.google.scriptId
        const query = `https://script.google.com/macros/s/${scriptId}/exec` + asQueryArgs({
          text: text,
          source: src,
          target: dst,
        })
        const respText = await getText(query)
        this.wss.notifyOne([this.user.id], this.name, {
          event: 'translated', data: {
            in: text,
            out: respText,
          }
        }, ws)
      },
      'conn': (ws) => {
        this.updateClient('init', ws)
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

export default SpeechToTextModule
