const fn = require('../../fn.js')

class DrawcastModule {
  constructor(db, user, chatClient, helixClient, storage, cache, ws, wss) {
    this.user = user
    this.wss = wss
    this.name = 'drawcast'
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
    }
  }

  getWsEvents () {
    return {
      'conn': (ws) => {
        this.wss.notifyOne([this.user.id], this.name, {
          event: 'init',
        }, ws)
      },
      'post': (ws, data) => {
        this.wss.notifyAll([this.user.id], this.name, data)
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
