import { logger } from '../common/fn'
import xhr from '../net/xhr'

const log = logger('TimeApi.ts')

export class TimeApi {
  public async getTimeAtTimezone(timezone: string): Promise<string> {
    try {
      const resp = await xhr.get(`https://www.timeapi.io/api/Time/current/zone?timeZone=${timezone}`)
      const json = await resp.json() as any
      return json.time
    } catch (e: any) {
      log.error(e)
      return ''
    }
  }
}
