import { dirname } from 'path'
import { fileURLToPath } from 'url'
import cookieParser from 'cookie-parser'
import express, { NextFunction, Response } from 'express'
import path from 'path'
import Templates from './services/Templates'
import http from 'http'
import { logger } from './common/fn'
import { Bot } from './types'
import { createRouter as createTwitchRouter } from './web_routes/twitch'
import { createRouter as createApiRouter } from './web_routes/api'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const log = logger('WebServer.ts')

class WebServer {
  private handle: http.Server | null

  constructor() {
    this.handle = null
  }

  async listen(bot: Bot) {
    const app = express()

    const templates = new Templates(__dirname)
    templates.add('templates/twitch_redirect_uri.html')

    const indexFile = path.resolve(`${__dirname}/../../build/public/index.html`)

    app.get('/pub/:id', async (req, res, _next) => {
      const row = await bot.getDb().get('robyottoko.pub', {
        id: req.params.id,
      })
      if (row && row.target) {
        req.url = row.target
        // @ts-ignore
        req.app.handle(req, res)
        return
      }
      res.status(404).send()
    })

    const requireLogin = (req: any, res: any, next: NextFunction) => {
      if (!req.token) {
        if (req.method === 'GET') {
          res.redirect(302, '/login')
        } else {
          res.status(401).send('not allowed')
        }
        return
      }
      return next()
    }

    app.use(cookieParser())
    app.use(bot.getAuth().addAuthInfoMiddleware())
    app.use('/', express.static('./build/public'))
    app.use('/static', express.static('./public/static'))
    app.use('/uploads', express.static('./data/uploads'))

    app.use('/api', createApiRouter(bot))

    app.use('/twitch', createTwitchRouter(templates, bot))

    app.all('/login', async (_req, res: Response, _next: NextFunction) => {
      res.sendFile(indexFile);
    })

    app.all('/password-reset', async (_req, res: Response, _next: NextFunction) => {
      res.sendFile(indexFile);
    })

    app.all('*', requireLogin, express.json({ limit: '50mb' }), async (req: any, res: Response, next: NextFunction) => {
      const method = req.method.toLowerCase()
      const key = req.url
      for (const m of bot.getModuleManager().all(req.user.id)) {
        const map = m.getRoutes()
        if (map && map[method] && map[method][key]) {
          await map[method][key](req, res, next)
          return
        }
      }

      res.sendFile(indexFile);
    })

    const httpConf = bot.getConfig().http
    this.handle = app.listen(
      httpConf.port,
      httpConf.hostname,
      () => log.info(`server running on http://${httpConf.hostname}:${httpConf.port}`)
    )
  }
  close() {
    if (this.handle) {
      this.handle.close()
    }
  }
}

export default WebServer
