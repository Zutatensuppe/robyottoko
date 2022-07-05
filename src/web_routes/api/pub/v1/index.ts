'use strict'

import express, { Response, Router } from 'express'
import cors from 'cors'
import { TokenType } from '../../../../services/Tokens'
import { Bot } from '../../../../types'
import TwitchHelixClient from '../../../../services/TwitchHelixClient'
import { getChatters } from '../../../../services/Chatters'

export const createRouter = (
  bot: Bot,
): Router => {
  const router = express.Router()
  router.use(cors())
  router.get('/chatters', async (req, res: Response) => {
    if (!req.query.apiKey) {
      res.status(403).send({ ok: false, error: 'api key missing' })
      return
    }
    const apiKey = String(req.query.apiKey)
    const t = await bot.getTokens().getByTokenAndType(apiKey, TokenType.API_KEY)
    if (!t) {
      res.status(403).send({ ok: false, error: 'invalid api key' })
      return
    }
    const user = await bot.getUsers().getById(t.user_id)
    if (!user) {
      res.status(400).send({ ok: false, error: 'user_not_found' })
      return
    }
    if (!req.query.channel) {
      res.status(400).send({ ok: false, error: 'channel missing' })
      return
    }

    const channelName = String(req.query.channel)
    const helixClient = new TwitchHelixClient(
      bot.getConfig().twitch.tmi.identity.client_id,
      bot.getConfig().twitch.tmi.identity.client_secret
    )
    const channelId = await helixClient.getUserIdByNameCached(channelName, bot.getCache())
    if (!channelId) {
      res.status(400).send({ ok: false, error: 'unable to determine channel id' })
      return
    }

    let dateSince: Date
    if (req.query.since) {
      try {
        dateSince = new Date(String(req.query.since))
      } catch (e) {
        res.status(400).send({ ok: false, error: 'unable to parse since' })
        return
      }
    } else {
      const stream = await helixClient.getStreamByUserIdCached(channelId, bot.getCache())
      if (!stream) {
        res.status(400).send({ ok: false, error: 'stream not online at the moment' })
        return
      }
      dateSince = new Date(stream.started_at)
    }
    const userNames = await getChatters(bot.getDb(), channelId, dateSince)
    res.status(200).send({ ok: true, data: { chatters: userNames, since: dateSince } })
  })
  return router
}
