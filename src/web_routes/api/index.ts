'use strict'

import express, { NextFunction, Response, Router } from 'express'
import multer from 'multer'
import { logger, nonce } from '../../common/fn'
import { TwitchChannel } from '../../services/TwitchChannels'
import TwitchHelixClient from '../../services/TwitchHelixClient'
import { UpdateUser, User } from '../../services/Users'
import Variables from '../../services/Variables'
import { Bot, UploadedFile } from '../../types'
import { createRouter as createApiPubV1Router } from './pub/v1'
import { createRouter as createUserRouter } from './user'

const log = logger('api/index.ts')

export const createRouter = (
  bot: Bot,
): Router => {

  const requireLoginApi = (req: any, res: any, next: NextFunction) => {
    if (!req.token) {
      res.status(401).send({})
      return
    }
    return next()
  }

  const uploadDir = './data/uploads'
  const storage = multer.diskStorage({
    destination: uploadDir,
    filename: function (req, file, cb) {
      cb(null, `${nonce(6)}-${file.originalname}`);
    }
  })
  const upload = multer({ storage }).single('file');

  const router = express.Router()
  router.post('/upload', requireLoginApi, (req, res: Response) => {
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

  router.post('/logout', requireLoginApi, async (req: any, res: Response) => {
    if (req.token) {
      await bot.getAuth().destroyToken(req.token)
      res.clearCookie("x-token")
    }
    res.send({ success: true })
  })

  router.post('/widget/create_url', requireLoginApi, express.json(), async (req: any, res: Response) => {
    const type = req.body.type
    const pub = req.body.pub
    const url = await bot.getWidgets().createWidgetUrl(type, req.user.id)
    res.send({
      url: pub ? (await bot.getWidgets().pubUrl(url)) : url
    })
  })

  router.get('/page/index', requireLoginApi, async (req: any, res: Response) => {
    const mappedWidgets = await bot.getWidgets().getWidgetInfos(req.user.id)
    res.send({ widgets: mappedWidgets })
  })

  router.get('/page/variables', requireLoginApi, async (req: any, res: Response) => {
    const variables = new Variables(bot.getDb(), req.user.id)
    res.send({ variables: await variables.all() })
  })

  router.post('/save-variables', requireLoginApi, express.json(), async (req: any, res: Response) => {
    const variables = new Variables(bot.getDb(), req.user.id)
    await variables.replace(req.body.variables || [])
    res.send()
  })

  router.get('/data/global', async (req: any, res: Response) => {
    res.send({
      registeredUserCount: await bot.getUsers().countUsers(),
      streamingUserCount: await bot.getTwitchChannels().countUniqueUsersStreaming(),
    })
  })

  router.get('/page/settings', requireLoginApi, async (req: any, res: Response) => {
    const user = await bot.getUsers().getById(req.user.id) as User
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
        groups: await bot.getUsers().getGroups(user.id)
      },
      twitchChannels: await bot.getTwitchChannels().allByUserId(req.user.id),
    })
  })

  router.get('/pub/:id', async (req, res, _next) => {
    const row = await bot.getDb().get('robyottoko.pub', {
      id: req.params.id,
    })
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

  router.post('/save-settings', requireLoginApi, express.json(), async (req: any, res: Response) => {
    if (!req.user.groups.includes('admin')) {
      if (req.user.id !== req.body.user.id) {
        // editing other user than self
        res.status(401).send({ reason: 'not_allowed_to_edit_other_users' })
        return
      }
    }

    const originalUser = await bot.getUsers().getById(req.body.user.id)
    if (!originalUser) {
      res.status(404).send({ reason: 'user_does_not_exist' })
      return
    }

    const user: UpdateUser = {
      id: req.body.user.id,
    }
    if (req.user.groups.includes('admin')) {
      user.tmi_identity_client_id = req.body.user.tmi_identity_client_id
      user.tmi_identity_client_secret = req.body.user.tmi_identity_client_secret
      user.tmi_identity_username = req.body.user.tmi_identity_username
      user.tmi_identity_password = req.body.user.tmi_identity_password
    }

    const twitch_channels = req.body.twitch_channels.map((channel: TwitchChannel) => {
      channel.user_id = user.id
      return channel
    })

    await bot.getUsers().save(user)
    await bot.getTwitchChannels().saveUserChannels(user.id, twitch_channels)

    const changedUser = await bot.getUsers().getById(user.id)
    if (changedUser) {
      bot.getEventHub().emit('user_changed', changedUser)
    } else {
      log.error({
        user_id: user.id,
      }, 'save-settings: user doesn\'t exist after saving it')
    }
    res.send()
  })

  router.post('/twitch/user-id-by-name', requireLoginApi, express.json(), async (req: any, res: Response) => {
    let clientId
    let clientSecret
    if (!req.user.groups.includes('admin')) {
      const u = await bot.getUsers().getById(req.user.id) as User
      clientId = u.tmi_identity_client_id || bot.getConfig().twitch.tmi.identity.client_id
      clientSecret = u.tmi_identity_client_secret || bot.getConfig().twitch.tmi.identity.client_secret
    } else {
      clientId = req.body.client_id
      clientSecret = req.body.client_secret
    }
    if (!clientId) {
      res.status(400).send({ reason: 'need client id' });
      return
    }
    if (!clientSecret) {
      res.status(400).send({ reason: 'need client secret' });
      return
    }

    try {
      // todo: maybe fill twitchChannels instead of empty array
      const client = new TwitchHelixClient(clientId, clientSecret)
      res.send({ id: await client.getUserIdByNameCached(req.body.name, bot.getCache()) })
    } catch (e) {
      res.status(500).send("Something went wrong!");
    }
  })

  router.use('/user', createUserRouter(requireLoginApi))
  router.use('/pub/v1', createApiPubV1Router(bot))
  return router
}
