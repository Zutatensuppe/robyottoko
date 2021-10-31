import Db from "../Db.ts"

const TABLE = 'cache'

function Cache(/** @type Db */ db) {
  return {
    set: (key, value) => {
      db.upsert(TABLE, { key, value: JSON.stringify(value) }, { key })
    },
    get: (key) => {
      const row = db.get(TABLE, { key })
      return row ? JSON.parse(row.value) : null
    },
  }
}

export default Cache
