const config = require('../src/config.js')
const { Db } = require('../src/storage/Db.js')

const db = new Db(config.db.file)
db.patch(config.db.patches_dir)
db.close()
