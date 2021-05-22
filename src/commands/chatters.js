const fn = require('./../fn.js')

const chatters = (
  /** @type Db */     db
) => async (command, client, target, context, msg) => {
  console.log('hey')
  const say = fn.sayFn(client, target)

  // get currently running stream
  const stream = db.get('streams', {
    broadcaster_user_id: context['room-id'],
  }, [{ started_at: -1 }])
  if (!stream) {
    say(`Sorry, I couldn't determine who participated in chat...`)
    return
  }

  const [whereSql, whereValues] = db._buildWhere({
    broadcaster_user_id: context['room-id'],
    created_at: { '$gte': stream.started_at },
  })
  const userNames = db._getMany(
    `select display_name from chat_log ${whereSql} group by user_name`,
    whereValues
  ).map(r => r.display_name)

  // TODO: accomodate for max message length (maybe better in say fn)
  say(`Chatters: ${userNames.join(', ')}`)
}

module.exports = chatters
