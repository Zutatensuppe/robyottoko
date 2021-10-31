import Db from "../Db"
import { GlobalVariable } from "../types"

const TABLE = 'variables'

function Variables(
  db: Db,
  userId: number,
) {
  const set = (name: string, value: any) => {
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
    get: (name: string): any => {
      const row = db.get(TABLE, { name, user_id: userId })
      return row ? JSON.parse(row.value) : null
    },
    all: (): GlobalVariable[] => {
      const rows = db.getMany(TABLE, { user_id: userId })
      return rows.map(row => ({
        name: row.name,
        value: JSON.parse(row.value),
      }))
    },
    replace: (variables: GlobalVariable[]) => {
      const names = variables.map(v => v.name)
      db.delete(TABLE, { user_id: userId, name: { '$nin': names } })
      variables.forEach(({ name, value }) => {
        set(name, value)
      })
    },
  }
}

export default Variables
