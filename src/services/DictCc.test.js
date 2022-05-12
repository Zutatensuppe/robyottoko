import dictCc from './DictCc'
import fs from 'fs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)


test.each([
  {
    file: __dirname + '/fixtures/dictcc.1.fixture.html',
    expected: [
      { from: 'жопа', to: ['ass'] },
      { from: 'сука', to: ['bitch'] },
    ]
  },
  {
    file: __dirname + '/fixtures/dictcc.2.fixture.html',
    expected: [
      { from: 'ass', to: ['осёл', 'жопа'] },
    ]
  },
  {
    file: __dirname + '/fixtures/dictcc.3.fixture.html',
    expected: [
      { from: 'gently', to: ['нежно', 'осторожно', 'тихо'] },
    ]
  },
  {
    file: __dirname + '/fixtures/dictcc.4.fixture.html',
    expected: [
      { from: 'осторожно', to: ['warily', 'gently'] },
    ]
  },
  {
    file: __dirname + '/fixtures/dictcc.5.fixture.html',
    expected: [
      { from: 'Не знаю.', to: ['Dunno.'] },
    ]
  },
  {
    file: __dirname + '/fixtures/dictcc.6.fixture.html',
    expected: [
      { from: 'Good morning!', to: ['Доброе утро!'] },
    ]
  },
  {
    file: __dirname + '/fixtures/dictcc.7.fixture.html',
    expected: [
      { from: 'Guten Morgen!', to: ['Good morning!', 'Good morrow!'] },
    ]
  },
  {
    file: __dirname + '/fixtures/dictcc.8.fixture.html',
    expected: [
      { from: 'dame', to: ['Dame', 'Frauenzimmer', 'Weibsbild', 'Frau', 'Matrone'] },
      { from: 'Dame', to: ['Freifrau'] },
      {
        from: 'Dame', to: [
          "lady", "madam", "draughts", "dame", "checkers", "queen",
          "chequers", "checker game", "signora", "king", "gentlewoman",
        ]
      },
    ]
  },
  {
    file: __dirname + '/fixtures/dictcc.9.fixture.html',
    expected: [
      {
        from: 'Zug', to: [
          "train", "tug", "drag", "gulp", "platoon", "streak", "draw", "draught",
          "feature", "swig", "trait", "puff", "move", "pull", "draft", "strain",
          "artic", "hit", "procession", "stroke", "migration", "traction", "slide",
          "extension", "characteristic", "line", "lineament", "cortege", "inclination",
          "linear progression", "flue", "team", "plunger", "stop knob", "journey",
          "discipline",
        ]
      },
    ]
  },
  {
    file: __dirname + '/fixtures/dictcc.10.fixture.html',
    expected: [
      {
        from: 'law', to: [
          'Gesetz', 'Recht', 'Jura', 'Rechtswissenschaft', 'Regel',
          'Rechtswesen', 'Juristerei', 'Lehrsatz', 'Jurisprudenz',
          'Vorgabe', 'Jus',
        ],
      },
    ]
  },
])('parseResult', ({ file, expected }) => {
  const txt = fs.readFileSync(file)
  const actual = dictCc.parseResult(String(txt))
  expect(actual).toStrictEqual(expected)
})
