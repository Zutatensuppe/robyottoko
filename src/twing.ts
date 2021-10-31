import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { TwingEnvironment, TwingLoaderFilesystem } from 'twing'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const render = async (template: string, data: Record<string, any>) => {
  const loader = new TwingLoaderFilesystem(__dirname + '/templates')
  const twing = new TwingEnvironment(loader)
  return twing.render(template, data)
}
