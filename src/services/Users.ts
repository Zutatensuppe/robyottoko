import Db, { Where } from "../Db"

const TABLE = 'user'

interface User {
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

interface UpdateUser {
  id?: number
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

class Users {
  private db: Db
  constructor(db: Db) {
    this.db = db
  }

  get(by: Where): User | null {
    return this.db.get(TABLE, by) || null
  }

  all(): User[] {
    return this.db.getMany(TABLE)
  }

  getById(id: number): User | null {
    return this.get({ id })
  }

  save(user: UpdateUser) {
    return this.db.upsert(TABLE, user, { id: user.id })
  }

  getGroups(id: number): string[] {
    const rows = this.db._getMany(`
select g.name from user_group g inner join user_x_user_group x
where x.user_id = ?`, [id])
    return rows.map(r => r.name)
  }

  createUser(user: UpdateUser) {
    return this.db.insert(TABLE, user)
  }
}

export default Users
