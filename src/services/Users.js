import Db from "../Db.ts"

const TABLE = 'user'

function Users(/** @type Db */ db) {
  const get = (by) => db.get(TABLE, by)
  return {
    all: () => db.getMany(TABLE),
    get,
    getById: (id) => get({ id }),
    save: (user) => db.upsert(TABLE, user, { id: user.id }),
    getGroups: (id) => {
      const rows = db._getMany(`
select g.name from user_group g inner join user_x_user_group x
where x.user_id = ?`, [id])
      return rows.map(r => r.name)
    },
    createUser: (user) => db.insert(TABLE, user),
  }
}

export default Users
