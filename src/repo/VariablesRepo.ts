'use strict'

import { GlobalVariable, VariableValue } from "../types"
import { Repo } from "./Repo"

const TABLE = 'robyottoko.variables'

interface Row {
  user_id: number
  name: string
  value: string
}

export class VariablesRepo extends Repo {
  async set(userId: number, name: string, value: VariableValue): Promise<void> {
    await this.db.upsert<Row>(TABLE, {
      user_id: userId,
      name,
      value: JSON.stringify(value),
    }, {
      name,
      user_id: userId,
    })
  }

  async get(userId: number, name: string): Promise<VariableValue> {
    const row = await this.db.get<Row>(TABLE, { name, user_id: userId })
    return row ? JSON.parse(row.value) : null
  }

  async all(userId: number): Promise<GlobalVariable[]> {
    const rows = await this.db.getMany(TABLE, { user_id: userId })
    return rows.map(row => ({
      name: row.name,
      value: JSON.parse(row.value),
    }))
  }

  async replace(userId: number, variables: GlobalVariable[]): Promise<void> {
    const names = variables.map(v => v.name)
    await this.db.delete(TABLE, { user_id: userId, name: { '$nin': names } })
    for (const { name, value } of variables) {
      await this.set(userId, name, value)
    }
  }
}
