'use strict'

import type { Response, Router } from 'express'
import express from 'express'
import cors from 'cors'
import { TokenType } from '../../../../repo/Tokens'
import type { Bot } from '../../../../types'
import TwitchHelixClient from '../../../../services/TwitchHelixClient'
import type DrawcastModule from '../../../../mod/modules/DrawcastModule'

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
    const t = await bot.getRepos().token.getByTokenAndType(apiKey, TokenType.API_KEY)
    if (!t) {
      res.status(403).send({ ok: false, error: 'invalid api key' })
      return
    }
    const user = await bot.getRepos().user.getById(t.user_id)
    if (!user) {
      res.status(400).send({ ok: false, error: 'user_not_found' })
      return
    }
    if (!req.query.channel) {
      res.status(400).send({ ok: false, error: 'channel missing' })
      return
    }

    const channelName = String(req.query.channel)
    const channelId = await bot.getHelixClient().getUserIdByNameCached(channelName, bot.getCache())
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
      const stream = await bot.getHelixClient().getStreamByUserIdCached(channelId, bot.getCache())
      if (!stream) {
        res.status(400).send({ ok: false, error: 'stream not online at the moment' })
        return
      }
      dateSince = new Date(stream.started_at)
    }
    const userNames = await bot.getRepos().chatLog.getChatters(channelId, dateSince)
    res.status(200).send({ ok: true, data: { chatters: userNames, since: dateSince } })
  })

  router.get('/drawcast/images', async (req, res: Response) => {
    if (!req.query.apiKey) {
      res.status(403).send({ ok: false, error: 'api key missing' })
      return
    }
    const apiKey = String(req.query.apiKey)
    const t = await bot.getRepos().token.getByTokenAndType(apiKey, TokenType.API_KEY)
    if (!t) {
      res.status(403).send({ ok: false, error: 'invalid api key' })
      return
    }
    const user = await bot.getRepos().user.getById(t.user_id)
    if (!user) {
      res.status(400).send({ ok: false, error: 'user_not_found' })
      return
    }
    const drawcastModule = bot.getModuleManager().get(user.id, 'drawcast') as (DrawcastModule | null)
    if (!drawcastModule) {
      res.status(400).send({ ok: false, error: 'module_not_found' })
      return
    }

    res.status(200).send({ ok: true, data: { images: drawcastModule.getImages() } })
  })

  return router
}
