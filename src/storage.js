const path = require('path')
const fs = require('fs')

function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

class FileStorage {
  constructor(file) {
    this.file = file
    ensureDirectoryExistence(this.file)
  }
  load () {
    try {
      return fs.readFileSync(this.file)
    } catch (e) {
      return null
    }
  }
  save (data) {
    return fs.writeFileSync(this.file, data)
  }
}

class JsonStorage extends FileStorage {
  load () {
    const txt = super.load()
    return txt ? JSON.parse('' + txt) : null
  }
  save (data) {
    return super.save(JSON.stringify(data))
  }
}

module.exports = {
  FileStorage,
  JsonStorage,
}
