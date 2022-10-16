'use strict'

import express, { Response, Router } from 'express'
import { RequireLoginApiMiddleware } from '../../../net/middleware/RequireLoginApiMiddleware'
import { ApiUserData } from '../../../types'

export const createRouter = (): Router => {
  const router = express.Router()
  router.get('/me', RequireLoginApiMiddleware, async (req: any, res: Response) => {
    const apiUser: ApiUserData = {
      user: req.user,
      token: req.cookies['x-token'],
    }
    res.send(apiUser)
  })
  return router
}
