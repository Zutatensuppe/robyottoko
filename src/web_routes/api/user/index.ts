'use strict'

import express, { Response, Router } from 'express'
import { RequireLoginApiMiddleware } from '../../../net/middleware/RequireLoginApiMiddleware'
import { ApiUserData, Bot } from '../../../types'

export const createRouter = (
  bot: Bot,
): Router => {
  const router = express.Router()
  router.get('/me', RequireLoginApiMiddleware, async (req: any, res: Response) => {
    const apiUser: ApiUserData = {
      user: req.user,
      token: req.cookies['x-token'],
      cannyToken: bot.getCanny().createToken(req.user),
    }
    res.send(apiUser)
  })
  return router
}
