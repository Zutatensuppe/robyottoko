const fn = require('./fn.js')
const people = {
  cmds: {
    '!atesoe': fn.fnRandom([
      '大丈夫だよ〜　It\'s ok!',
      '私の靴下好きですか？ https://www.twitch.tv/atesoe/clip/FlaccidBeautifulPeachPogChamp Kappa',
    ]),
    '!achan': fn.fnRandom([
      'ひ・み・つ'
    ]),
    '!eiseraph': 'Boo! 👻',
    '!empompom': 'Proud owner of textbooks! Total value: 120Euro Kreygasm',
    '!mayumi': 'learns all the languages!',
    '!sekkachi': fn.fnRandom([
      'je voudrais un fromage StinkyCheese',
      'Yes, he is the byte leader ^_^',
    ]),
    '!hiro': fn.fnRandom([
      'いいね〜、いいね〜！',
      'Almost fire! CurseLit CurseLit',
    ]),
    '!shares5': fn.fnRandom([
      'LUL',
    ]),
    '!kingznaiver': fn.fnRandom([
      'Yoshi! https://www.youtube.com/watch?v=lpTrDMSThHQ',
    ]),
    '!bacing': fn.fnRandom([
      '私のブレインはましゅっどポテトになりました',
      'bundes! LUL',
    ]),
  }
}

module.exports = people
