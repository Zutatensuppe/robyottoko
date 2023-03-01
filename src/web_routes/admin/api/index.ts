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
    const adminGroup = await bot.getDb().get('user_group', { name: 'admin' }) as { id: number, name: string } | null
    if (!adminGroup) {
      res.status(403).send({ ok: false, error: 'no admin' })
      return
    }
    const userXAdmin = await bot.getDb().get('user_x_user_group', {
      user_group_id: adminGroup.id,
      user_id: user.id,
    })
    if (!userXAdmin) {
      res.status(403).send({ ok: false, error: 'not an admin' })
      return
    }
    next()
  }

  const router = express.Router()
  
  router.use(requireLoginApi)

  router.get('/announcements', async (req, res: Response) => {
    const items = await bot.getDb().getMany('announcements', undefined, [{ created: -1 }])
    res.send(items)
  })

  router.post('/announcements', express.json(), async (req, res: Response) => {
    const message = req.body.message
    const title = req.body.title
    const id = await bot.getDb().insert('announcements', { created: new Date(), title, message }, 'id')
    const announcement = await bot.getDb().get('announcements', { id }) as { message: string, title: string, id: number, created: string } | null
    if (!announcement) {
      res.status(500).send({ ok: false, reason: 'unable_to_get_announcement' })
      return
    }
    await bot.getDiscord().announce(`**${title}**\n${announcement.message}`)
    res.send({ announcement })
  })
  return router
}
