'use strict'

import express, { NextFunction, Response, Router } from 'express'
import crypto from 'crypto'
import { logger } from '../../common/fn'
import Templates from '../../services/Templates'
import { Bot, TwitchConfig } from '../../types'
import { handleOAuthCodeCallback } from '../../oauth'

const log = logger('twitch/index.ts')

export const createRouter = (
  templates: Templates,
  configTwitch: TwitchConfig,
  baseUrl: string,
  bot: Bot,
): Router => {
  const verifyTwitchSignature = (req: any, res: any, next: NextFunction) => {
    const body = Buffer.from(req.rawBody, 'utf8')
    const msg = `${req.headers['twitch-eventsub-message-id']}${req.headers['twitch-eventsub-message-timestamp']}${body}`
    const hmac = crypto.createHmac('sha256', configTwitch.eventSub.transport.secret)
    hmac.update(msg)
    const expected = `sha256=${hmac.digest('hex')}`
    if (req.headers['twitch-eventsub-message-signature'] !== expected) {
      log.debug(req)
      log.error('bad message signature', {
        got: req.headers['twitch-eventsub-message-signature'],
        expected,
      })
      res.status(403).send({ reason: 'bad message signature' })
      return
    }

    return next()
  }

  const router = express.Router()
  // twitch calls this url after auth
  // from here we render a js that reads the token and shows it to the user
  router.get('/redirect_uri', async (req: any, res: Response) => {
    if (!req.user) {
      // a user that is not logged in may not visit to redirect_uri
      res.status(401).send({ reason: 'not logged in' })
      return
    }
    // in success case:
    // http://localhost:3000/
    // ?code=gulfwdmys5lsm6qyz4xiz9q32l10
    // &scope=channel%3Amanage%3Apolls+channel%3Aread%3Apolls
    // &state=c3ab8aa609ea11e793ae92361f002671
    if (req.query.code) {
      const code = `${req.query.code}`
      const redirectUri = `${baseUrl}/twitch/redirect_uri`
      const result = await handleOAuthCodeCallback(
        code,
        redirectUri,
        bot,
        req.user,
      )
      if (result.error) {
        res.status(500).send("Something went wrong!");
        return
      }
      if (result.updated) {
        const changedUser = await bot.getUsers().getById(req.user.id)
        if (changedUser) {
          bot.getEventHub().emit('user_changed', changedUser)
        } else {
          log.error(`updating user twitch channels: user doesn't exist after saving it: ${req.user.id}`)
        }
      }
      res.send(templates.render('templates/twitch_redirect_uri.html', {}))
      return
    }

    // in error case:
    // http://localhost:3000/
    // ?error=access_denied
    // &error_description=The+user+denied+you+access
    // &state=c3ab8aa609ea11e793ae92361f002671
    res.status(403).send({ reason: req.query })
  })

  router.post(
    '/event-sub/',
    express.json({ verify: (req: any, _res: Response, buf) => { req.rawBody = buf } }),
    verifyTwitchSignature,
    async (req, res) => {
      log.debug(req.body)
      log.debug(req.headers)

      if (req.headers['twitch-eventsub-message-type'] === 'webhook_callback_verification') {
        log.info(`got verification request, challenge: ${req.body.challenge}`)

        res.write(req.body.challenge)
        res.send()
        return
      }

      if (req.headers['twitch-eventsub-message-type'] === 'notification') {
        log.info(`got notification request: ${req.body.subscription.type}`)

        if (req.body.subscription.type === 'stream.online') {
          // insert new stream
          await bot.getDb().insert('robyottoko.streams', {
            broadcaster_user_id: req.body.event.broadcaster_user_id,
            started_at: new Date(req.body.event.started_at),
          })
        } else if (req.body.subscription.type === 'stream.offline') {
          // get last started stream for broadcaster
          // if it exists and it didnt end yet set ended_at date
          const stream = await bot.getDb().get('robyottoko.streams', {
            broadcaster_user_id: req.body.event.broadcaster_user_id,
          }, [{ started_at: -1 }])
          if (!stream.ended_at) {
            await bot.getDb().update('robyottoko.streams', {
              ended_at: new Date(),
            }, { id: stream.id })
          }
        }

        res.send()
        return
      }

      res.status(400).send({ reason: 'unhandled sub type' })
    })
  return router
}
