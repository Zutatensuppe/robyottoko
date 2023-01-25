'use strict'

import express, { NextFunction, Response, Router } from 'express'
import multer from 'multer'
import { logger, nonce } from '../../common/fn'
import { UpdateUser, User } from '../../repo/Users'
import { Bot, UploadedFile } from '../../types'
import { createRouter as createApiPubV1Router } from './pub/v1'
import { createRouter as createUserRouter } from './user'
import { RequireLoginApiMiddleware } from '../../net/middleware/RequireLoginApiMiddleware'

const log = logger('api/index.ts')

export const createRouter = (
  bot: Bot,
): Router => {

  const uploadDir = './data/uploads'
  const storage = multer.diskStorage({
    destination: uploadDir,
    filename: function (req, file, cb) {
      cb(null, `${nonce(6)}-${file.originalname}`);
    }
  })
  const upload = multer({ storage }).single('file');

  const router = express.Router()
  router.post('/upload', RequireLoginApiMiddleware, (req, res: Response) => {
    upload(req, res, (err) => {
      if (err) {
        log.error({ err })
        res.status(400).send("Something went wrong!");
        return
      }
      if (!req.file) {
        log.error({ err })
        res.status(400).send("Something went wrong!");
        return
      }

      const uploadedFile: UploadedFile = {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        encoding: req.file.encoding,
        mimetype: req.file.mimetype,
        destination: req.file.destination,
        filename: req.file.filename,
        filepath: req.file.path,
        size: req.file.size,
        urlpath: `/uploads/${encodeURIComponent(req.file.filename)}`,
      }
      res.send(uploadedFile)
    })
  })

  router.get('/conf', async (req, res: Response) => {
    const conf = bot.getConfig()
    res.send({
      wsBase: conf.ws.connectstring,
      twitchClientId: conf.twitch.tmi.identity.client_id,
    })
  })

  router.post('/logout', RequireLoginApiMiddleware, async (req: any, res: Response) => {
    if (req.token) {
      await bot.getAuth().destroyToken(req.token)
      res.clearCookie("x-token")
    }
    res.send({ success: true })
  })

  router.post('/widget/create_url', RequireLoginApiMiddleware, express.json(), async (req: any, res: Response) => {
    const type = req.body.type
    const pub = req.body.pub
    const url = await bot.getWidgets().createWidgetUrl(type, req.user.id)
    res.send({
      url: pub ? (await bot.getWidgets().pubUrl(url)) : url
    })
  })

  router.get('/page/index', RequireLoginApiMiddleware, async (req: any, res: Response) => {
    res.send({ widgets: await bot.getWidgets().getWidgetInfos(req.user.id) })
  })

  router.get('/page/variables', RequireLoginApiMiddleware, async (req: any, res: Response) => {
    res.send({ variables: await bot.getRepos().variables.all(req.user.id) })
  })

  router.post('/save-variables', RequireLoginApiMiddleware, express.json(), async (req: any, res: Response) => {
    await bot.getRepos().variables.replace(req.user.id, req.body.variables || [])
    res.send()
  })

  router.get('/data/global', async (req: any, res: Response) => {
    res.send({
      registeredUserCount: await bot.getRepos().user.countUsers(),
      streamingUserCount: await bot.getRepos().user.countUniqueUsersStreaming(),
    })
  })

  router.get('/page/settings', RequireLoginApiMiddleware, async (req: any, res: Response) => {
    const user = await bot.getRepos().user.getById(req.user.id) as User
    res.send({
      user: {
        id: user.id,
        twitch_id: user.twitch_id,
        twitch_login: user.twitch_login,
        name: user.name,
        email: user.email,
        tmi_identity_username: user.tmi_identity_username,
        tmi_identity_password: user.tmi_identity_password,
        tmi_identity_client_id: user.tmi_identity_client_id,
        tmi_identity_client_secret: user.tmi_identity_client_secret,
        bot_enabled: user.bot_enabled,
        bot_status_messages: user.bot_status_messages,
        groups: await bot.getRepos().user.getGroups(user.id)
      },
    })
  })

  router.get('/pub/:id', async (req, res, _next) => {
    const row = await bot.getRepos().pub.getById(req.params.id)
    if (row && row.target) {
      req.url = row.target
      // @ts-ignore
      router.handle(req, res)
      return
    }
    res.status(404).send()
  })

  router.get('/widget/:widget_type/:widget_token/', async (req, res: Response, _next: NextFunction) => {
    const type = req.params.widget_type
    const token = req.params.widget_token
    const user = (await bot.getAuth().userFromWidgetToken(token, type))
      || (await bot.getAuth().userFromPubToken(token))
    if (!user) {
      res.status(404).send()
      return
    }
    log.debug({ route: `/widget/:widget_type/:widget_token/`, type, token })
    const w = bot.getWidgets().getWidgetDefinitionByType(type)
    if (w) {
      res.send({
        widget: w.type,
        title: w.title,
        wsUrl: bot.getConfig().ws.connectstring,
        widgetToken: token,
      })
      return
    }
    res.status(404).send()
  })

  router.post('/save-settings', RequireLoginApiMiddleware, express.json(), async (req: any, res: Response) => {
    if (!req.user.groups.includes('admin')) {
      if (req.user.id !== req.body.user.id) {
        // editing other user than self
        res.status(401).send({ reason: 'not_allowed_to_edit_other_users' })
        return
      }
    }

    const originalUser = await bot.getRepos().user.getById(req.body.user.id)
    if (!originalUser) {
      res.status(404).send({ reason: 'user_does_not_exist' })
      return
    }

    const user: UpdateUser = {
      id: req.body.user.id,
      bot_enabled: req.body.user.bot_enabled,
      bot_status_messages: req.body.user.bot_status_messages,
    }
    if (req.user.groups.includes('admin')) {
      user.tmi_identity_client_id = req.body.user.tmi_identity_client_id
      user.tmi_identity_client_secret = req.body.user.tmi_identity_client_secret
      user.tmi_identity_username = req.body.user.tmi_identity_username
      user.tmi_identity_password = req.body.user.tmi_identity_password
    }

    await bot.getRepos().user.save(user)

    const changedUser = await bot.getRepos().user.getById(user.id)
    if (changedUser) {
      bot.getEventHub().emit('user_changed', changedUser)
    } else {
      log.error({
        user_id: user.id,
      }, 'save-settings: user doesn\'t exist after saving it')
    }
    res.send()
  })

  router.use('/user', createUserRouter(bot))
  router.use('/pub/v1', createApiPubV1Router(bot))
  return router
}
