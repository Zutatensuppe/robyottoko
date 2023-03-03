'use strict'

import express, { NextFunction, Response, Router } from 'express'
import { Bot } from '../../../types'

export const createRouter = (
  bot: Bot,
): Router => {
  const requireLoginApi = async (req: any, res: any, next: NextFunction) => {
    if (!req.token) {
      res.status(401).send({})
      return
    }
    const user = req.user || null
    if (!user || !user.id) {
      res.status(403).send({ ok: false, error: 'forbidden' })
      return
    }
    const adminGroup = await bot.getRepos().user.getAdminGroup()
    if (!adminGroup) {
      res.status(403).send({ ok: false, error: 'no admin' })
      return
    }
    const userXAdmin = await bot.getRepos().user.isUserInGroup(user.id, adminGroup.id)
    if (!userXAdmin) {
      res.status(403).send({ ok: false, error: 'not an admin' })
      return
    }
    next()
  }

  const router = express.Router()

  router.use(requireLoginApi)

  router.get('/announcements', async (req, res: Response) => {
    const items = await bot.getRepos().announcementRepo.getAll()
    res.send(items)
  })

  router.post('/announcements', express.json(), async (req, res: Response) => {
    const message = req.body.message
    const title = req.body.title
    const id = await bot.getRepos().announcementRepo.insert({ created: new Date(), title, message })
    const announcement = await bot.getRepos().announcementRepo.get({ id })
    if (!announcement) {
      res.status(500).send({ ok: false, reason: 'unable_to_get_announcement' })
      return
    }
    await bot.getDiscord().announce(`**${title}**\n${announcement.message}`)
    res.send({ announcement })
  })
  return router
}
