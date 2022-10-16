import { NextFunction } from 'express'

export const RequireLoginApiMiddleware = (req: any, res: any, next: NextFunction) => {
  if (!req.token) {
    res.status(401).send({})
    return
  }
  return next()
}
