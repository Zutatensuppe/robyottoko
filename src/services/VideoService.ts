import { hash, logger } from '../common/fn'
import FileSystem from './FileSystem'
import childProcess from 'child_process'
import config from '../config'

const log = logger('api/services/VideoService.ts')

export class VideoService {
  public static isTwitchClipUrl(url: string): boolean {
    return !!(
      url.match(/^https:\/\/clips\.twitch\.tv\/.+/) ||
      url.match(/^https:\/\/www\.twitch\.tv\/[^/]+\/clip\/.+/)
    )
  }

  public static async downloadVideo(originalUrl: string): Promise<string> {
    // if video url looks like a twitch clip url, dl it first
    const filename = `${hash(originalUrl)}-clip.webm`
    const outfile = `./data/uploads/${filename}`
    const fileURL = `/uploads/${filename}`

    if (await FileSystem.fileExists(outfile)) {
      log.debug({ outfile }, 'video exists')
      return fileURL
    }

    log.debug({ outfile }, 'downloading the video')
    const childDl = childProcess.execFile(
      config.youtubeDlBinary,
      [originalUrl, '-o', `${outfile}.tmp`],
    )
    await new Promise((resolve) => {
      childDl.on('close', resolve)
    })

    const start = Date.now()
    log.debug({ outfile }, 'converting/fixing the video')
    const childFix = childProcess.execFile(
      config.ffmpegBinary,
      ['-i', `${outfile}.tmp`, '-vf', 'scale=1280:-1', '-c:v', 'libvpx', '-b:v', '800k', '-c:a', 'libvorbis', '-deadline', 'realtime', '-cpu-used', '5', outfile],
    )
    await new Promise((resolve) => {
      childFix.on('close', resolve)
    })
    const end = Date.now()
    log.debug({ outfile, duration: end - start }, 'video conversion finished')

    void FileSystem.rm(outfile + '.tmp')

    return fileURL
  }
}
