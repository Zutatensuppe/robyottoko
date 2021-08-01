const Db = require("../Db")

const TABLE = 'variables'

function Variables(
  /** @type Db */ db,
  /** @type number */ userId,
) {
  const set = (name, value) => {
    db.upsert(TABLE, {
      name,
      user_id: userId,
      value: JSON.stringify(value),
    }, {
      name,
      user_id: userId,
    })
  }

  return {
    set,
    get: (name) => {
      const row = db.get(TABLE, { name, user_id: userId })
      return row ? JSON.parse(row.value) : null
    },
    all: () => {
      const rows = db.getMany(TABLE, { user_id: userId })
      return rows.map(row => ({
        name: row.name,
        value: JSON.parse(row.value),
      }))
    },
    replace: (/** @type array */ variables) => {
      const names = variables.map(v => v.name)
      db.delete(TABLE, { user_id: userId, name: { '$nin': names } })
      variables.forEach(({ name, value }) => {
        set(name, value)
      })
    },
  }
}

module.exports = Variables
