'use strict'

import express, { NextFunction, Response, Router } from 'express'
import { ApiUserData } from '../../../types'

export const createRouter = (
  requireLoginApi: (req: any, res: any, next: NextFunction) => void
): Router => {
  const router = express.Router()
  router.get('/me', requireLoginApi, async (req: any, res: Response) => {
    const apiUser: ApiUserData = {
      user: req.user,
      token: req.cookies['x-token'],
    }
    res.send(apiUser)
  })
  return router
}
