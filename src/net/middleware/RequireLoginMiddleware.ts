import type { NextFunction } from 'express'

export const RequireLoginMiddleware = (req: any, res: any, next: NextFunction) => {
  if (req.token) {
    return next()
  }

  if (req.method === 'GET') {
    res.redirect(302, '/login')
  } else {
    res.status(401).send('not allowed')
  }
}
