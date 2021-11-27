import dictCc from './DictCc'
import fs from 'fs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)


test('parseResult', () => {
  let txt, actual, expected
  txt = fs.readFileSync(__dirname + '/fixtures/dictcc.1.fixture.html')
  actual = dictCc.parseResult(String(txt))
  expected = [
    { from: 'жопа', to: ['ass'] },
    { from: 'сука', to: ['bitch'] },
  ]
  expect(actual).toStrictEqual(expected)

  txt = fs.readFileSync(__dirname + '/fixtures/dictcc.2.fixture.html')
  actual = dictCc.parseResult(String(txt))
  expected = [
    { from: 'ass', to: ['осёл', 'жопа'] },
  ]
  expect(actual).toStrictEqual(expected)

  txt = fs.readFileSync(__dirname + '/fixtures/dictcc.3.fixture.html')
  actual = dictCc.parseResult(String(txt))
  expected = [
    { from: 'gently', to: ['нежно', 'осторожно', 'тихо'] },
  ]
  expect(actual).toStrictEqual(expected)

  txt = fs.readFileSync(__dirname + '/fixtures/dictcc.4.fixture.html')
  actual = dictCc.parseResult(String(txt))
  expected = [
    { from: 'осторожно', to: ['warily', 'gently'] },
  ]
  expect(actual).toStrictEqual(expected)

  txt = fs.readFileSync(__dirname + '/fixtures/dictcc.5.fixture.html')
  actual = dictCc.parseResult(String(txt))
  expected = [
    { from: 'Не знаю.', to: ['Dunno.'] },
  ]
  expect(actual).toStrictEqual(expected)

  txt = fs.readFileSync(__dirname + '/fixtures/dictcc.6.fixture.html')
  actual = dictCc.parseResult(String(txt))
  expected = [
    { from: 'Good morning!', to: ['Доброе утро!'] },
  ]
  expect(actual).toStrictEqual(expected)

  txt = fs.readFileSync(__dirname + '/fixtures/dictcc.7.fixture.html')
  actual = dictCc.parseResult(String(txt))
  expected = [
    { from: 'Guten Morgen!', to: ['Good morning!', 'Good morrow!'] },
  ]
  expect(actual).toStrictEqual(expected)

  txt = fs.readFileSync(__dirname + '/fixtures/dictcc.8.fixture.html')
  actual = dictCc.parseResult(String(txt))
  expected = [
    { from: 'dame', to: ['Dame', 'Frauenzimmer', 'Weibsbild', 'Frau', 'Matrone'] },
    { from: 'Dame', to: ['Freifrau'] },
  ]
  expect(actual).toStrictEqual(expected)
})
