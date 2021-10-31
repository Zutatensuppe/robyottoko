import Db, { Where } from "../Db"

const TABLE = 'user'

type Id = string | number

interface User {
  id: Id
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
  id?: Id
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

function Users(db: Db) {
  const get = (by: Where) => db.get(TABLE, by)
  return {
    all: () => db.getMany(TABLE),
    get,
    getById: (id: Id) => get({ id }),
    save: (user: UpdateUser) => db.upsert(TABLE, user, { id: user.id }),
    getGroups: (id: Id) => {
      const rows = db._getMany(`
select g.name from user_group g inner join user_x_user_group x
where x.user_id = ?`, [id])
      return rows.map(r => r.name)
    },
    createUser: (user: UpdateUser) => db.insert(TABLE, user),
  }
}

export default Users
