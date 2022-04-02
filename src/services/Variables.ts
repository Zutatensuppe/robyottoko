import Db from "../DbPostgres"
import { GlobalVariable, VariableValue } from "../types"

const TABLE = 'robyottoko.variables'

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

  async set(name: string, value: VariableValue): Promise<void> {
    await this.db.upsert(TABLE, {
      name,
      user_id: this.userId,
      value: JSON.stringify(value),
    }, {
      name,
      user_id: this.userId,
    })
  }

  async get(name: string): Promise<VariableValue> {
    const row = await this.db.get(TABLE, { name, user_id: this.userId })
    return row ? JSON.parse(row.value) : null
  }

  async all(): Promise<GlobalVariable[]> {
    const rows = await this.db.getMany(TABLE, { user_id: this.userId })
    return rows.map(row => ({
      name: row.name,
      value: JSON.parse(row.value),
    }))
  }

  async replace(variables: GlobalVariable[]): Promise<void> {
    const names = variables.map(v => v.name)
    await this.db.delete(TABLE, { user_id: this.userId, name: { '$nin': names } })
    for (const { name, value } of variables) {
      await this.set(name, value)
    }
  }
}

export default Variables
