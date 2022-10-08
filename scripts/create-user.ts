#!/usr/bin/env node

import config from '../src/config'
import Db from '../src/DbPostgres'
import readline from 'readline'

const question = (q: any) => new Promise((resolve, reject) => {
  const cl = readline.createInterface(process.stdin, process.stdout)
  cl.question(q, answer => {
    cl.close()
    resolve(answer)
  })
})

const log = console.log

  ; (async () => {
    const db = new Db(config.db.connectStr, config.db.patchesDir)
    await db.connect()
    await db.patch()

    log('Please enter credentials for the new user.')

    const username: string = `${await question('Username: ')}`

    const user = {
      name: username,

      // for tmi in general, see: https://dev.twitch.tv/docs/irc/#building-the-bot
      // this data is editable in the backend after logging in, so
      // no need to ask for it now
      tmi_identity_username: '', // bot name
      tmi_identity_password: '', // bot oauth token
      tmi_identity_client_id: '', // bot app client id
      tmi_identity_client_secret: '', // bot app client secret
    }

    const user_id = await db.upsert('robyottoko.user', user, { name: user.name }, 'id')
    log('user created/updated: ' + user_id)
    await db.close()
  })()
