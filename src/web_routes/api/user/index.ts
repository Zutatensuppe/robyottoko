'use strict'

import express, { NextFunction, Response, Router } from 'express'
import Tokens, { TokenType } from '../../../services/Tokens'
import Users, { CreateUser } from '../../../services/Users'
import { MailService } from '../../../types'
import fn from '../../../fn'

export const createRouter = (
  tokenRepo: Tokens,
  userRepo: Users,
  mail: MailService,
  requireLoginApi: (req: any, res: any, next: NextFunction) => void
): Router => {
  const router = express.Router()
  router.get('/me', requireLoginApi, async (req: any, res: Response) => {
    res.send({
      user: req.user,
      token: req.cookies['x-token'],
    })
  })
  router.post('/_reset_password', express.json(), async (req, res) => {
    const plainPass = req.body.pass || null
    const token = req.body.token || null
    if (!plainPass || !token) {
      res.status(400).send({ reason: 'bad request' })
      return
    }

    const tokenObj = await tokenRepo.getByTokenAndType(token, TokenType.PASSWORD_RESET)
    if (!tokenObj) {
      res.status(400).send({ reason: 'bad request' })
      return
    }

    const originalUser = await userRepo.getById(tokenObj.user_id)
    if (!originalUser) {
      res.status(404).send({ reason: 'user_does_not_exist' })
      return
    }

    const pass = fn.passwordHash(plainPass, originalUser.salt)
    const user = { id: originalUser.id, pass }
    await userRepo.save(user)
    await tokenRepo.delete(tokenObj.token)
    res.send({ success: true })
  })

  router.post('/_request_password_reset', express.json(), async (req, res) => {
    const email = req.body.email || null
    if (!email) {
      res.status(400).send({ reason: 'bad request' })
      return
    }

    const user = await userRepo.get({ email, status: 'verified' })
    if (!user) {
      res.status(404).send({ reason: 'user not found' })
      return
    }

    const token = await tokenRepo.createToken(user.id, TokenType.PASSWORD_RESET)
    mail.sendPasswordResetMail({ user, token })
    res.send({ success: true })
  })

  router.post('/_resend_verification_mail', express.json(), async (req, res) => {
    const email = req.body.email || null
    if (!email) {
      res.status(400).send({ reason: 'bad request' })
      return
    }

    const user = await userRepo.getByEmail(email)
    if (!user) {
      res.status(404).send({ reason: 'email not found' })
      return
    }

    if (user.status !== 'verification_pending') {
      res.status(400).send({ reason: 'already verified' })
      return
    }

    const token = await tokenRepo.createToken(user.id, TokenType.REGISTRATION)
    mail.sendRegistrationMail({ user, token })
    res.send({ success: true })
  })

  router.post('/_register', express.json(), async (req, res) => {
    const salt = fn.passwordSalt()
    const user: CreateUser = {
      name: req.body.user,
      pass: fn.passwordHash(req.body.pass, salt),
      salt: salt,
      email: req.body.email,
      status: 'verification_pending',
      tmi_identity_username: '',
      tmi_identity_password: '',
      tmi_identity_client_id: '',
      tmi_identity_client_secret: '',
    }
    let tmpUser = await userRepo.getByEmail(user.email)
    if (tmpUser) {
      if (tmpUser.status === 'verified') {
        // user should use password reset function
        res.status(400).send({ reason: 'verified_mail_already_exists' })
      } else {
        // user should use resend registration mail function
        res.status(400).send({ reason: 'unverified_mail_already_exists' })
      }
      return
    }
    tmpUser = await userRepo.getByName(user.name)
    if (tmpUser) {
      if (tmpUser.status === 'verified') {
        // user should use password reset function
        res.status(400).send({ reason: 'verified_name_already_exists' })
      } else {
        // user should use resend registration mail function
        res.status(400).send({ reason: 'unverified_name_already_exists' })
      }
      return
    }

    const userId = await userRepo.createUser(user)
    if (!userId) {
      res.status(400).send({ reason: 'unable to create user' })
      return
    }
    const token = await tokenRepo.createToken(userId, TokenType.REGISTRATION)
    mail.sendRegistrationMail({ user, token })
    res.send({ success: true })
  })
  return router
}
