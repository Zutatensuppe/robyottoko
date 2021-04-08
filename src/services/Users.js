const TABLE = 'user'

function Users(db) {
  return {
    all: () => db.getMany(TABLE),
    getById: (id) => db.get(TABLE, {id}),
    getByNameAndPass: (name, pass) => db.get(TABLE, {name, pass}),
  }
}

module.exports = Users
