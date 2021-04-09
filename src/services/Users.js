const TABLE = 'user'

function Users(db) {
  return {
    all: () => db.getMany(TABLE),
    getById: (id) => db.get(TABLE, {id}),
    getByNameAndPass: (name, pass) => db.get(TABLE, {name, pass}),
    save: (user) => db.upsert(TABLE, user, {id: user.id}),
  }
}

module.exports = Users
