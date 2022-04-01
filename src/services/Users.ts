import Db, { WhereRaw } from "../DbPostgres"

const TABLE = 'user'

export interface User {
  id: number
  name: string
  pass: string
  salt: string
  email: string
  status: string // 'verification_pending' |
  tmi_identity_username: string
  tmi_identity_password: string
  tmi_identity_client_id: string
  tmi_identity_client_secret: string
}

export interface UpdateUser {
  id: number
  name?: string
  pass?: string
  salt?: string
  email?: string
  status?: string // 'verification_pending' |
  tmi_identity_username?: string
  tmi_identity_password?: string
  tmi_identity_client_id?: string
  tmi_identity_client_secret?: string
}

export interface CreateUser {
  name: string
  pass: string
  salt: string
  email: string
  status: string // 'verification_pending' |
  tmi_identity_username: string
  tmi_identity_password: string
  tmi_identity_client_id: string
  tmi_identity_client_secret: string
}

class Users {
  private db: Db
  constructor(db: Db) {
    this.db = db
  }

  async get(by: WhereRaw): Promise<User | null> {
    return await this.db.get(TABLE, by) || null
  }

  async all(): Promise<User[]> {
    return await this.db.getMany(TABLE)
  }

  async getById(id: number): Promise<User | null> {
    return await this.get({ id })
  }

  async save(user: UpdateUser): Promise<any> {
    return await this.db.upsert(TABLE, user, { id: user.id })
  }

  async getGroups(id: number): Promise<string[]> {
    const rows: { name: string }[] = await this.db._getMany(`
select g.name from user_group g inner join user_x_user_group x
where x.user_id = ?`, [id])
    return rows.map(r => r.name)
  }

  async createUser(user: CreateUser): Promise<number> {
    return (await this.db.insert(TABLE, user)) as number
  }
}

export default Users
