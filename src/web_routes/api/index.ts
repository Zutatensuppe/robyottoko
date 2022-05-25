'use strict'

import express, { NextFunction, Response, Router } from 'express'
import { Emitter, EventType } from 'mitt'
import multer from 'multer'
import { logger, nonce, YEAR } from '../../common/fn'
import Db from '../../DbPostgres'
import fn from '../../fn'
import Auth from '../../net/Auth'
import WebSocketServer from '../../net/WebSocketServer'
import Cache from '../../services/Cache'
import Tokens, { TokenType } from '../../services/Tokens'
import TwitchChannels, { TwitchChannel } from '../../services/TwitchChannels'
import TwitchHelixClient from '../../services/TwitchHelixClient'
import Users, { UpdateUser, User } from '../../services/Users'
import Variables from '../../services/Variables'
import Widgets from '../../services/Widgets'
import { MailService, TwitchConfig, UploadedFile } from '../../types'
import { createRouter as createApiPubV1Router } from './pub/v1'
import { createRouter as createUserRouter } from './user'

const log = logger('api/index.ts')

export const createRouter = (
  eventHub: Emitter<Record<EventType, unknown>>,
  db: Db,
  tokenRepo: Tokens,
  userRepo: Users,
  mail: MailService,
  wss: WebSocketServer,
  auth: Auth,
  configTwitch: TwitchConfig,
  cache: Cache,
  widgets: Widgets,
  twitchChannelRepo: TwitchChannels,
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
        log.error(err)
        res.status(400).send("Something went wrong!");
        return
      }
      if (!req.file) {
        log.error(err)
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
    res.send({
      wsBase: wss.connectstring(),
    })
  })

  router.post('/logout', requireLoginApi, async (req: any, res: Response) => {
    if (req.token) {
      await auth.destroyToken(req.token)
      res.clearCookie("x-token")
    }
    res.send({ success: true })
  })

  router.post('/_handle-token', express.json(), async (req, res) => {
    const token = req.body.token || null
    if (!token) {
      res.status(400).send({ reason: 'invalid_token' })
      return
    }
    const tokenObj = await tokenRepo.getByTokenAndType(token, TokenType.REGISTRATION)
    if (!tokenObj) {
      res.status(400).send({ reason: 'invalid_token' })
      return
    }
    await userRepo.save({ status: 'verified', id: tokenObj.user_id })
    await tokenRepo.delete(tokenObj.token)
    res.send({ type: 'registration-verified' })

    // new user was registered. module manager should be notified about this
    // so that bot doesnt need to be restarted :O
    const user = await userRepo.getById(tokenObj.user_id)
    if (user) {
      eventHub.emit('user_registration_complete', user)
    } else {
      log.error(`registration: user doesn't exist after saving it: ${tokenObj.user_id}`)
    }
    return
  })

  router.post('/widget/create_url', requireLoginApi, express.json(), async (req: any, res: Response) => {
    const type = req.body.type
    const pub = req.body.pub
    const url = await widgets.createWidgetUrl(type, req.user.id)
    res.send({
      url: pub ? (await widgets.pubUrl(url)) : url
    })
  })

  router.get('/page/index', requireLoginApi, async (req: any, res: Response) => {
    const mappedWidgets = await widgets.getWidgetInfos(req.user.id)
    res.send({ widgets: mappedWidgets })
  })

  router.get('/page/variables', requireLoginApi, async (req: any, res: Response) => {
    const variables = new Variables(db, req.user.id)
    res.send({ variables: await variables.all() })
  })

  router.post('/save-variables', requireLoginApi, express.json(), async (req: any, res: Response) => {
    const variables = new Variables(db, req.user.id)
    await variables.replace(req.body.variables || [])
    res.send()
  })

  router.get('/data/global', async (req: any, res: Response) => {
    res.send({
      registeredUserCount: await userRepo.countVerifiedUsers(),
      streamingUserCount: await twitchChannelRepo.countUniqueUsersStreaming(),
    })
  })

  router.get('/page/settings', requireLoginApi, async (req: any, res: Response) => {
    const user = await userRepo.getById(req.user.id) as User
    res.send({
      user: {
        id: user.id,
        name: user.name,
        salt: user.salt,
        email: user.email,
        status: user.status,
        tmi_identity_username: user.tmi_identity_username,
        tmi_identity_password: user.tmi_identity_password,
        tmi_identity_client_id: user.tmi_identity_client_id,
        tmi_identity_client_secret: user.tmi_identity_client_secret,
        groups: await userRepo.getGroups(user.id)
      },
      twitchChannels: await twitchChannelRepo.allByUserId(req.user.id),
    })
  })

  router.post('/save-settings', requireLoginApi, express.json(), async (req: any, res: Response) => {
    if (!req.user.groups.includes('admin')) {
      if (req.user.id !== req.body.user.id) {
        // editing other user than self
        res.status(401).send({ reason: 'not_allowed_to_edit_other_users' })
        return
      }
    }

    const originalUser = await userRepo.getById(req.body.user.id)
    if (!originalUser) {
      res.status(404).send({ reason: 'user_does_not_exist' })
      return
    }

    const user: UpdateUser = {
      id: req.body.user.id,
    }
    if (req.body.user.pass) {
      user.pass = fn.passwordHash(req.body.user.pass, originalUser.salt)
    }
    if (req.body.user.email) {
      user.email = req.body.user.email
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

    await userRepo.save(user)
    await twitchChannelRepo.saveUserChannels(user.id, twitch_channels)


    const changedUser = await userRepo.getById(user.id)
    if (changedUser) {
      eventHub.emit('user_changed', changedUser)
    } else {
      log.error(`save-settings: user doesn't exist after saving it: ${user.id}`)
    }
    res.send()
  })

  router.post('/twitch/user-id-by-name', requireLoginApi, express.json(), async (req: any, res: Response) => {
    let clientId
    let clientSecret
    if (!req.user.groups.includes('admin')) {
      const u = await userRepo.getById(req.user.id) as User
      clientId = u.tmi_identity_client_id || configTwitch.tmi.identity.client_id
      clientSecret = u.tmi_identity_client_secret || configTwitch.tmi.identity.client_secret
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
      const client = new TwitchHelixClient(clientId, clientSecret, [])
      res.send({ id: await client.getUserIdByName(req.body.name, cache) })
    } catch (e) {
      res.status(500).send("Something went wrong!");
    }
  })

  router.post('/auth', express.json(), async (req, res: Response) => {
    const user = await auth.getUserByNameAndPass(req.body.user, req.body.pass)
    if (!user) {
      res.status(401).send({ reason: 'bad credentials' })
      return
    }

    const token = await auth.getUserAuthToken(user.id)
    res.cookie('x-token', token, { maxAge: 1 * YEAR, httpOnly: true })
    res.send()
  })

  router.use('/user', createUserRouter(tokenRepo, userRepo, mail, requireLoginApi))
  router.use('/pub/v1', createApiPubV1Router(db, tokenRepo, userRepo, cache, configTwitch))
  return router
}
