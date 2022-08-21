import path from 'path'
import { promises as fs } from 'fs'
import { logger } from '../common/fn'

const log = logger('Templates.ts')

class Templates {
  private baseDir: string
  private templates: Record<string, { templatePathAbsolute: string, templateContents: string | null }> = {}
  constructor(baseDir: string) {
    this.baseDir = baseDir
  }

  add(templatePath: string) {
    const templatePathAbsolute = path.join(this.baseDir, templatePath)
    this.templates[templatePath] = { templatePathAbsolute, templateContents: null }
  }

  async render(templatePath: string, data: Record<string, string>): Promise<string> {
    const tmpl = this.templates[templatePath]
    if (tmpl.templateContents === null) {
      try {
        tmpl.templateContents = (await fs.readFile(tmpl.templatePathAbsolute)).toString();
      } catch (e) {
        log.error({ e }, 'error loading template')
        tmpl.templateContents = ''
      }
    }
    return tmpl.templateContents.replace(/\{\{(.*?)\}\}/g, (m0: string, m1: string) => {
      return data[m1.trim()] || ''
    })
  }
}

export default Templates
