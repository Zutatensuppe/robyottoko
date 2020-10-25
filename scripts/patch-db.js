const config = require('../src/config.js')
const storage = require('../src/storage')

const db = new storage.Db(config.db.file)
db.patch(config.db.patches_dir)
db.close()
