const TABLE = 'cache'

function Cache(db) {
  return {
    set: (key, value) => {
      db.upsert(TABLE, {key, value: JSON.stringify(value)}, {key})
    },
    get: (key) => {
      const row = db.get(TABLE, {key})
      return row ? JSON.parse(row.value) : null
    },
  }
}

module.exports = Cache
