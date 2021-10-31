import Db from "../Db"

const TABLE = 'cache'

function Cache(db: Db) {
  return {
    set: (key: string, value: any) => {
      db.upsert(TABLE, { key, value: JSON.stringify(value) }, { key })
    },
    get: (key: string): any => {
      const row = db.get(TABLE, { key })
      return row ? JSON.parse(row.value) : null
    },
  }
}

export default Cache
