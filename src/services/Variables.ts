import Db from "../Db"
import { GlobalVariable, VariableValue } from "../types"

const TABLE = 'variables'

class Variables {
  private db: Db
  private userId: number

  constructor(
    db: Db,
    userId: number,
  ) {
    this.db = db
    this.userId = userId
  }

  set(name: string, value: VariableValue) {
    this.db.upsert(TABLE, {
      name,
      user_id: this.userId,
      value: JSON.stringify(value),
    }, {
      name,
      user_id: this.userId,
    })
  }

  get(name: string): VariableValue {
    const row = this.db.get(TABLE, { name, user_id: this.userId })
    return row ? JSON.parse(row.value) : null
  }

  all(): GlobalVariable[] {
    const rows = this.db.getMany(TABLE, { user_id: this.userId })
    return rows.map(row => ({
      name: row.name,
      value: JSON.parse(row.value),
    }))
  }

  replace(variables: GlobalVariable[]) {
    const names = variables.map(v => v.name)
    this.db.delete(TABLE, { user_id: this.userId, name: { '$nin': names } })
    variables.forEach(({ name, value }) => {
      this.set(name, value)
    })
  }
}

export default Variables
