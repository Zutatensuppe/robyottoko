import fn from './../fn.ts'
import Madochan from './../services/Madochan.js'

const madochanCreateWord = (
  /** @type string */ model,
  /** @type number */ weirdness,
) => async (
  command,
  client,
  /** @type string */ target,
  context,
  /** @type string */ msg,
  ) => {
    const say = fn.sayFn(client, target)
    const definition = command.args.join(' ')
    say(`Generating word for "${definition}"...`)
    const data = await Madochan.createWord({
      model: model,
      weirdness: weirdness,
      definition: definition,
    })
    if (data.word === '') {
      say(`Sorry, I could not generate a word :("`)
    } else {
      say(`"${definition}": ${data.word}`)
    }
  }

export default madochanCreateWord
