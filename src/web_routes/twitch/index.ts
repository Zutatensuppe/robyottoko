'use strict'

import express, { NextFunction, Response, Router } from 'express'
import crypto from 'crypto'
import { logger } from '../../common/fn'
import Db from '../../DbPostgres'
import Templates from '../../services/Templates'
import { TwitchConfig } from '../../types'

const log = logger('twitch/index.ts')

export const createRouter = (
  db: Db,
  templates: Templates,
  configTwitch: TwitchConfig,
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
  router.get('/redirect_uri', async (req, res: Response) => {
    res.send(templates.render('templates/twitch_redirect_uri.html', {}))
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
          await db.insert('robyottoko.streams', {
            broadcaster_user_id: req.body.event.broadcaster_user_id,
            started_at: new Date(req.body.event.started_at),
          })
        } else if (req.body.subscription.type === 'stream.offline') {
          // get last started stream for broadcaster
          // if it exists and it didnt end yet set ended_at date
          const stream = await db.get('robyottoko.streams', {
            broadcaster_user_id: req.body.event.broadcaster_user_id,
          }, [{ started_at: -1 }])
          if (!stream.ended_at) {
            await db.update('robyottoko.streams', {
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
