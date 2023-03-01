import { dirname } from 'path'
import { fileURLToPath } from 'url'
import cookieParser from 'cookie-parser'
import express, { NextFunction, Response } from 'express'
import path from 'path'
import http from 'http'
import { logger } from '../common/fn'
import { Bot } from '../types'
import { createRouter as createTwitchRouter } from '../web_routes/twitch'
import { createRouter as createApiRouter } from '../web_routes/api'
import { createRouter as createAdminApiRouter } from '../web_routes/admin/api'
import { RequireLoginMiddleware } from './middleware/RequireLoginMiddleware'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const log = logger('WebServer.ts')

class WebServer {
  private handle: http.Server | null = null

  async listen(bot: Bot) {
    const app = express()

    const indexFile = path.resolve(__dirname, '..', '..', 'build', 'public', 'index.html')

    app.use(cookieParser())
    app.use(bot.getAuth().addAuthInfoMiddleware())
    app.use('/', express.static('./build/public'))
    app.use('/static', express.static('./public/static'))
    app.use('/uploads', express.static('./data/uploads'))

    app.use('/api', createApiRouter(bot))
    app.use('/admin/api', createAdminApiRouter(bot))

    app.use('/twitch', createTwitchRouter(bot))

    app.all('/login', async (_req, res: Response, _next: NextFunction) => {
      res.sendFile(indexFile)
    })

    app.all('/password-reset', async (_req, res: Response, _next: NextFunction) => {
      res.sendFile(indexFile)
    })

    app.all('/widget/*', async (_req, res: Response, _next: NextFunction) => {
      res.sendFile(indexFile)
    })

    app.all('/pub/*', async (_req, res: Response, _next: NextFunction) => {
      res.sendFile(indexFile)
    })

    app.all('*', RequireLoginMiddleware, express.json({ limit: '50mb' }), async (req: any, res: Response, next: NextFunction) => {
      const method = req.method.toLowerCase()
      const key = req.url.replace(/\?.*$/, '')
      for (const m of bot.getModuleManager().all(req.user.id)) {
        const map = m.getRoutes()
        if (map && map[method] && map[method][key]) {
          await map[method][key](req, res, next)
          return
        }
      }

      res.sendFile(indexFile)
    })

    const httpConf = bot.getConfig().http
    this.handle = app.listen(
      httpConf.port,
      httpConf.hostname,
      () => log.info(`server running on http://${httpConf.hostname}:${httpConf.port}`),
    )
  }
  close() {
    if (this.handle) {
      this.handle.close()
    }
  }
}

export default WebServer
