const general = {
  cmds: {
    '!hyottoko': '俺はひょっとこ！ https://www.youtube.com/watch?v=DqTL1cU0sK8',
    '!discord': 'join Hyottoko Land! https://discord.gg/Fxy3TYC',
    '!w': async (params) => {
      if (r.word !== null) {
        return 'ナイスアイディア！ but no :P'
      }
      const phrase = params.join(' ')
      const data = await fn.lookupWord(phrase)
      if (data.length === 0) {
        return `Sorry, I didn't find anything for "${phrase}"`
      }
      const e = data[0]
  
      let found
      if (phrase.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/)) {
        found = e.senses[0].english_definitions.join(', ')
      } else {
        const j = e.japanese[0]
        found = j.word ? `${j.word} (${j.reading})` : j.reading
      }
      return `Phrase "${phrase}": ${found}`
    },
    '!topic': 'Today I listen/transcribe 村山籌子「三匹の小熊さん」 (\'Three little bears\' by Kazuko Murayama) http://kikudorabungak.main.jp/list/3kuma',
  }
}

module.exports = general
