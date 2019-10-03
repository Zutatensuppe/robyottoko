const fn = require('./fn.js')

const general = {
  cmds: {
    '!hyottoko': '俺はひょっとこ！ https://www.youtube.com/watch?v=DqTL1cU0sK8',
    '!discord': 'join Hyottoko Land! https://discord.gg/Fxy3TYC',
    '!w': async (context, params) => {
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
    '!boom': 'Boom! Tetris for para :P',
    '!whoop': 'Whoop! Tetris for para :D',
    '!bgm': 'Kantele パワー！ https://www.youtube.com/watch?v=rkUIGHmnw8E',
    '!topic': 'Japanese kikudora! 新美南吉「手袋を買いに」 http://kikudorabungak.main.jp/archives/219',
//    '!topic': 'TETRIS PAL Monthly Tournament! Brackets: https://cdn.discordapp.com/attachments/568778160255008768/627530375219904533/unknown.png Hosts: https://twitch.tv/ChrisForyst https://twitch.tv/Archina  https://twitch.tv/ClassicTetrisPAL
	  // 'Today I listen to/transcribe 村山籌子「三匹の小熊さん」 (\'Three little bears\' by Kazuko Murayama) http://kikudorabungak.main.jp/list/3kuma',
//     '!topic': 'Learn japanese. Let\'s try to speak about a topic for 1 minute! PogChamp',
  }
}

module.exports = general
