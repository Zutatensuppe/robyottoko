import { determineNewVolume } from "../fn";
import GeneralModule from "../mod/modules/GeneralModule";
import { MediaVolumeEffectData } from "../types";
import { Effect } from "./Effect";

export class MediaVolumeEffect extends Effect<MediaVolumeEffectData> {
  async apply(): Promise<void> {
    if (!this.rawCmd) {
      return
    }
    const m = this.contextModule as GeneralModule
    if (this.rawCmd.args.length === 0) {
      this.say(`Current volume: ${m.getCurrentMediaVolume()}`)
      return
    }

    const newVolume = determineNewVolume(
      this.rawCmd.args[0],
      m.getCurrentMediaVolume(),
    )
    await m.volume(newVolume)
    this.say(`New volume: ${m.getCurrentMediaVolume()}`)
  }
}
