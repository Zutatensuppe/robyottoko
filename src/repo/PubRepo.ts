'use strict'

import { Repo } from './Repo'

const TABLE = 'robyottoko.pub'

interface Row {
  id: string
  target: string
}

export class PubRepo extends Repo {

  async getByTarget(target: string): Promise<Row | null> {
    return await this.db.get(TABLE, { target })
  }

  async getById(id: string): Promise<Row | null> {
    return await this.db.get(TABLE, { id })
  }

  async insert(row: Row): Promise<void> {
    await this.db.insert(TABLE, row)
  }
}
