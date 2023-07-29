'use strict'

import express, { NextFunction, Response, Router } from 'express'
import crypto from 'crypto'
import { logger, YEAR } from '../../common/fn'
import { Bot } from '../../types'
import { HandleCodeCallbackResult, handleOAuthCodeCallback } from '../../oauth'
import { SubscribeEventHandler } from '../../services/twitch/SubscribeEventHandler'
import { FollowEventHandler } from '../../services/twitch/FollowEventHandler'
import { CheerEventHandler } from '../../services/twitch/CheerEventHandler'
import { ChannelPointRedeemEventHandler } from '../../services/twitch/ChannelPointRedeemEventHandler'
import { SubscriptionType } from '../../services/twitch/EventSub'
import { StreamOnlineEventHandler } from '../../services/twitch/StreamOnlineEventHandler'
import { StreamOfflineEventHandler } from '../../services/twitch/StreamOfflineEventHandler'
import { RaidEventHandler } from '../../services/twitch/RaidEventHandler'
import { EventSubEventHandler } from '../../services/twitch/EventSubEventHandler'
import { SubscriptionGiftEventHandler } from '../../services/twitch/SubscriptionGiftEventHandler'

const log = logger('twitch/index.ts')

export const createRouter = (
  bot: Bot,
): Router => {
  const handlers: Record<SubscriptionType, EventSubEventHandler<any>> = {
    [SubscriptionType.ChannelSubscribe]: new SubscribeEventHandler(),
    [SubscriptionType.ChannelSubscriptionGift]: new SubscriptionGiftEventHandler(),
    [SubscriptionType.ChannelFollow]: new FollowEventHandler(),
    [SubscriptionType.ChannelCheer]: new CheerEventHandler(),
    [SubscriptionType.ChannelRaid]: new RaidEventHandler(),
    [SubscriptionType.ChannelPointsCustomRewardRedemptionAdd]: new ChannelPointRedeemEventHandler(),
    [SubscriptionType.StreamOnline]: new StreamOnlineEventHandler(),
    [SubscriptionType.StreamOffline]: new StreamOfflineEventHandler(),
  }

  const verifyTwitchSignature = (req: any, res: any, next: NextFunction) => {
    const body = Buffer.from(req.rawBody, 'utf8')
    const msg = `${req.headers['twitch-eventsub-message-id']}${req.headers['twitch-eventsub-message-timestamp']}${body}`
    const hmac = crypto.createHmac('sha256', bot.getConfig().twitch.eventSub.transport.secret)
    hmac.update(msg)
    const expected = `sha256=${hmac.digest('hex')}`
    if (req.headers['twitch-eventsub-message-signature'] === expected) {
      return next()
    }

    log.debug({ req })
    log.error({
      got: req.headers['twitch-eventsub-message-signature'],
      expected,
    }, 'bad message signature')
    res.status(403).send({ reason: 'bad message signature' })
  }

  const getCodeCallbackResult = async (req: any): Promise<HandleCodeCallbackResult | null> => {
    const redirectUris = [
      `${bot.getConfig().http.url}/twitch/redirect_uri`,
      `${req.protocol}://${req.headers.host}/twitch/redirect_uri`,
    ]
    const user = req.user?.id ? await bot.getRepos().user.getById(req.user.id) : null
    for (const redirectUri of redirectUris) {
      const tmpResult = await handleOAuthCodeCallback(
        `${req.query.code}`,
        redirectUri,
        bot,
        user,
      )
      if (tmpResult) {
        return tmpResult
      }
    }
    return null
  }

  const router = express.Router()
  // twitch calls this url after auth
  // from here we render a js that reads the token and shows it to the user
  router.get('/redirect_uri', async (req: any, res: Response) => {
    // in success case:
    // http://localhost:3000/
    // ?code=gulfwdmys5lsm6qyz4xiz9q32l10
    // &scope=channel%3Amanage%3Apolls+channel%3Aread%3Apolls
    // &state=c3ab8aa609ea11e793ae92361f002671
    if (req.query.code) {
      const result = await getCodeCallbackResult(req)
      if (!result) {
        res.status(500).send('Something went wrong!')
        return
      }

      if (result.updated) {
        bot.getEventHub().emit('user_changed', result.user)
      } else if (result.created) {
        bot.getEventHub().emit('user_registration_complete', result.user)
      }

      const token = await bot.getAuth().getUserAuthToken(result.user.id)
      res.cookie('x-token', token, { maxAge: 1 * YEAR, httpOnly: true })
      res.redirect('/')
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
      if (req.headers['twitch-eventsub-message-type'] === 'webhook_callback_verification') {
        log.info({ challenge: req.body.challenge }, 'got verification request')
        res.write(req.body.challenge)
        res.send()
        return
      }

      if (req.headers['twitch-eventsub-message-type'] === 'notification') {
        log.info({ type: req.body.subscription.type }, 'got notification request')
        const row = await bot.getRepos().eventSub.getBySubscriptionId(req.body.subscription.id)
        if (!row) {
          log.info('unknown subscription_id')
          res.status(400).send({ reason: 'unknown subscription_id' })
          return
        }
        const user = await bot.getRepos().user.getById(row.user_id)
        if (!user) {
          log.info('unknown user')
          res.status(400).send({ reason: 'unknown user' })
          return
        }

        const handler = handlers[req.body.subscription.type as SubscriptionType]
        if (!handler) {
          log.info('unknown subscription type')
          res.status(400).send({ reason: 'unknown subscription type' })
          return
        }

        handler.handle(bot, user, req.body)
        res.send()
        return
      }

      res.status(400).send({ reason: 'unhandled sub type' })
    })
  return router
}
