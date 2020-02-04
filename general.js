const fn = require('./fn.js')

const general = {
  cmds: {
// japanese
    '!w': async (context, params) => {
      const phrase = params.join(' ')
      const data = await fn.lookupWord(phrase)
      if (data.length === 0) {
        return `Sorry, I didn't find anything for "${phrase}"`
      }
      const e = data[0]
      const j = e.japanese[0]
      const d = e.senses[0].english_definitions
      return `Phrase "${phrase}": ${j.word} (${j.reading}) ${d.join(', ')}`
    },
    '!jp': 'My japanese... https://pastebin.com/ujiMvrMk',
// tetris
    '!boom': 'Boom! Tetris for para :P',
    '!whoop': 'Whoop! Tetris for para :D',
    '!pb': 'PAL: 541456 (9-19)',

// stream general
    '!hyottoko': '俺はひょっとこ！ youtube.com/watch?v=DqTL1cU0sK8',
    '!discord': 'join Hyottoko Land! discord.gg/Fxy3TYC',
    '!from': 'I\'m from Germany.',
//    '!bgm': 'KingZNaiver パワー！ youtube.com/watch?v=CP7Jt7nyVM',
    // '!bgm': 'Various Artists!',
    '!bgm': 'https://www.youtube.com/watch?v=0ckMFFUDVws', // ghibli
    // '!bgm': 'KOTO パワー！ youtube.com/watch?v=lyieFu7BnHE',
//    '!bgm': 'Kantele パワー！ youtube.com/watch?v=rkUIGHmnw8E',
    '!topic': 'Random japanese language stuff :D', //'Japanese kikudora! 新美南吉「手袋を買いに」 http://kikudorabungak.main.jp/archives/219',
//    '!topic': 'TETRIS PAL Monthly Tournament! Brackets: https://cdn.discordapp.com/attachments/568778160255008768/627530375219904533/unknown.png Hosts: https://twitch.tv/ChrisForyst https://twitch.tv/Archina  https://twitch.tv/ClassicTetrisPAL
	  // 'Today I listen to/transcribe 村山籌子「三匹の小熊さん」 (\'Three little bears\' by Kazuko Murayama) http://kikudorabungak.main.jp/list/3kuma',
//     '!topic': 'Learn japanese. Let\'s try to speak about a topic for 1 minute! PogChamp',
  }
}

module.exports = general
