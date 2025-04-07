import { Stats } from 'fs'
import fs from 'fs/promises'

async function fileExists(file: string): Promise<boolean> {
  try {
    await fs.access(file)
    return true
  } catch (error) {
    return false
  }
}

async function readDir(dir: string): Promise<string[]> {
  return fs.readdir(dir)
}

async function readFile(file: string): Promise<string> {
  return fs.readFile(file, 'utf-8')
}

async function rm(path: string): Promise<void> {
  return fs.rm(path)
}

async function stat(path: string): Promise<Stats> {
  return fs.stat(path)
}

async function mkDir(path: string): Promise<string | undefined> {
  return fs.mkdir(path, { recursive: true })
}

async function writeFile(path: string, content: string | Buffer): Promise<void> {
  return fs.writeFile(path, content)
}

export default {
  fileExists,
  readDir,
  readFile,
  rm,
  stat,
  mkDir,
  writeFile,
}
