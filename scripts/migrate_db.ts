import config from '../src/config'
import DbSqlite from '../src/DbSqlite'
import DbPostgres from '../src/DbPostgres'
import { logger } from '../src/common/fn'

const log = logger('migrate_db.ts')

async function migrate_db() {
  const dbSqlite = new DbSqlite(config.db)
  const dbPostgres = new DbPostgres(config.db.connectStr, config.db.patchesDir)

  await dbPostgres.connect()
  await dbPostgres.patch()

  const tablesWithId = [
    'user',
    // 'streams', // skipping because not existant in sqlite anymore
    'chat_log',
    'user_group',
  ]

  const migrateTableWithId = async (table: string) => {
    log.info(`migrating table ${table}`)
    let max = 0
    for (const v of dbSqlite.getMany(table)) {
      if (table === 'chat_log') {
        v.created_at = new Date(v.created_at)
      }
      await dbPostgres.insert(`robyottoko.${table}`, v)
      max = Math.max(v.id, max)
    }
    await dbPostgres.run(`SELECT setval('${table}_id_seq', ${max});`)
  }
  for (const table of tablesWithId) {
    await migrateTableWithId(table)
  }

  const migrateTableWithoutId = async (table: string) => {
    log.info(`migrating table ${table}`)
    for (const v of dbSqlite.getMany(table)) {
      await dbPostgres.insert(`robyottoko.${table}`, v)
    }
  }

  const tablesWithoutId = [
    'token',
    'module',
    'cache',
    'twitch_channel',
    'user_x_user_group',
    'pub',
    'variables',
  ]
  for (const table of tablesWithoutId) {
    await migrateTableWithoutId(table)
  }

  await dbPostgres.close()
  dbSqlite.close()
}

migrate_db()
