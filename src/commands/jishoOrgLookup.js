const fn = require('./../fn.js')
const jishoOrg = require('./../services/jishoOrg.js')

const jishoOrgLookup = (
  // no params
) => async (command, client, target, context, msg) => {
  const say = fn.sayFn(client, target)
  const phrase = command.args.join(' ')
  const data = await jishoOrg.searchWord(phrase)
  if (data.length === 0) {
    say(`Sorry, I didn't find anything for "${phrase}"`)
    return
  }
  const e = data[0]
  const j = e.japanese[0]
  const d = e.senses[0].english_definitions

  say(`Phrase "${phrase}": ${j.word} (${j.reading}) ${d.join(', ')}`)
}

module.exports = jishoOrgLookup
