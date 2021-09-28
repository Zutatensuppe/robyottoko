const verbose = !process.argv.includes('--silent')

import config from '../src/config.js'
import Db from '../src/Db.js'

const db = new Db(config.db)
db.patch(verbose)
db.close()
