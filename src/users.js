const { JsonStorage } = require('./storage.js');

const userStorage = new JsonStorage('./data/users.json')
const tokenStorage = new JsonStorage('./data/tokens.json')

module.exports = {
  userStorage,
  tokenStorage,
}
