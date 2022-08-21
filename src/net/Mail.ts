// @ts-ignore
import SibApiV3Sdk from 'sib-api-v3-sdk'
import { logger } from '../common/fn';
import { MailConfig, MailServicePasswordResetData, MailServiceRegistrationData } from '../types';

const log = logger('Mail.ts')

type TransacEmailError = any
type TransacEmailResponseData = any

class Mail {
  private apiInstance: SibApiV3Sdk.TransactionalEmailsApi

  constructor(cfg: MailConfig) {
    const defaultClient = SibApiV3Sdk.ApiClient.instance
    const apiKey = defaultClient.authentications['api-key']
    apiKey.apiKey = cfg.sendinblue_api_key
    this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  }

  sendPasswordResetMail(passwordReset: MailServicePasswordResetData) {
    const mail = new SibApiV3Sdk.SendSmtpEmail();
    mail.subject = "{{params.subject}}";
    mail.htmlContent = `<html><body>
      <h1>Hello {{params.username}}</h1>
      <p>To reset your password for <a href="https://hyottoko.club">hyottoko.club</a>
      click the following link:</p>
      <p><a href="{{params.link}}">{{params.link}}</a></p>
      </body></html>`
    mail.sender = { name: "Hyottoko.club", email: "noreply@hyottoko.club" }
    mail.to = [{
      email: passwordReset.user.email,
      name: passwordReset.user.name,
    }]
    mail.params = {
      username: passwordReset.user.name,
      subject: "Password Reset for Hyottoko.club",
      link: `https://hyottoko.club/password-reset?t=${passwordReset.token.token}`
    }
    this.send(mail)
  }

  sendRegistrationMail(registration: MailServiceRegistrationData) {
    const mail = new SibApiV3Sdk.SendSmtpEmail();
    mail.subject = "{{params.subject}}";
    mail.htmlContent = `<html><body>
      <h1>Hello {{params.username}}</h1>
      <p>Thank you for registering an account at <a href="https://hyottoko.club">hyottoko.club</a>.</p>
      <p>Please confirm your registration by clicking the following link:</p>
      <p><a href="{{params.link}}">{{params.link}}</a></p>
      </body></html>`
    mail.sender = { name: "Hyottoko.club", email: "noreply@hyottoko.club" }
    mail.to = [{
      email: registration.user.email,
      name: registration.user.name,
    }]
    mail.params = {
      username: registration.user.name,
      subject: "User Registration on Hyottoko.club",
      link: `https://hyottoko.club/login?t=${registration.token.token}`
    }
    this.send(mail)
  }

  send(mail: SibApiV3Sdk.SendSmtpEmail) {
    this.apiInstance.sendTransacEmail(mail).then(function (data: TransacEmailResponseData) {
      log.info({ data }, 'API called successfully')
    }, function (error: TransacEmailError) {
      log.error({ error })
    });
  }
}

export default Mail
