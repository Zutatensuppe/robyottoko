import path from 'path'
import { promises as fs } from 'fs'

class Templates {
  private baseDir: string
  private templates: Record<string, string> = {}
  constructor(baseDir: string) {
    this.baseDir = baseDir
  }

  async add(templatePath: string) {
    const templatePathAbsolute = path.join(this.baseDir, templatePath)
    this.templates[templatePath] = (await fs.readFile(templatePathAbsolute)).toString();
  }

  render(templatePath: string, data: Record<string, string>) {
    const template = this.templates[templatePath]
    return template.replace(/\{\{(.*?)\}\}/g, (m0: string, m1: string) => {
      return data[m1.trim()] || ''
    })
  }
}

export default Templates
