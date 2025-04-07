import { describe, expect, it } from 'vitest'
import { EmoteParser } from './EmoteParser'

describe('src/services/EmoteParser.ts', () => {
  describe('extractEmotes', () => {
    const testCases = [
      {
        name: 'no emotes',
        msgOriginal: 'lalahdlfadofho  sadf ',
        context: {},
        channel: '#robyottoko',
        expected: [],
      },
      {
        name: 'unicode emotes 1',
        msgOriginal: '👩‍⚕️',
        context: {},
        channel: '#robyottoko',
        expected: [
          { url: 'https://cdn.betterttv.net/assets/emoji/1f469-200d-2695-fe0f.svg' },
        ],
      },
      {
        name: 'unicode emotes 2',
        msgOriginal: ' 👨‍👩‍👧‍👦 ',
        context: {},
        channel: '#robyottoko',
        expected: [
          { url: 'https://cdn.betterttv.net/assets/emoji/1f468-200d-1f469-200d-1f467-200d-1f466.svg' },
        ],
      },
      {
        name: 'unicode emotes 2 alternative',
        msgOriginal: ' 👨👩👧👦 ',
        context: {},
        channel: '#robyottoko',
        expected: [
          { url: 'https://cdn.betterttv.net/assets/emoji/1f468.svg' },
          { url: 'https://cdn.betterttv.net/assets/emoji/1f469.svg' },
          { url: 'https://cdn.betterttv.net/assets/emoji/1f467.svg' },
          { url: 'https://cdn.betterttv.net/assets/emoji/1f466.svg' },
        ],
      },
      {
        name: 'unicode emotes 3',
        msgOriginal: '👨‍🦲',
        context: {},
        channel: '#robyottoko',
        expected: [
          { url: 'https://cdn.betterttv.net/assets/emoji/1f468-200d-1f9b2.svg' },
        ],
      },
      {
        name: 'unicode emotes 3 alternative',
        msgOriginal: '👨🦲',
        context: {},
        channel: '#robyottoko',
        expected: [
          { url: 'https://cdn.betterttv.net/assets/emoji/1f468.svg' },
          { url: 'https://cdn.betterttv.net/assets/emoji/1f9b2.svg' },
        ],
      },
      {
        name: 'unicode emotes 4',
        msgOriginal: ' 🙇‍♀️ ',
        context: {},
        channel: '#robyottoko',
        expected: [
          { url: 'https://cdn.betterttv.net/assets/emoji/1f647-200d-2640-fe0f.svg' },
        ],
      },
      {
        name: 'unicode emotes 4 alternative',
        msgOriginal: ' 🙇♀️ ',
        context: {},
        channel: '#robyottoko',
        expected: [
          { url: 'https://cdn.betterttv.net/assets/emoji/1f647.svg' },
          { url: 'https://cdn.betterttv.net/assets/emoji/2640.svg' },
        ],
      },
      {
        name: 'unicode emotes 5',
        msgOriginal: '🍀🍀🐸',
        context: {},
        channel: '#robyottoko',
        expected: [
          { url: 'https://cdn.betterttv.net/assets/emoji/1f340.svg' },
          { url: 'https://cdn.betterttv.net/assets/emoji/1f340.svg' },
          { url: 'https://cdn.betterttv.net/assets/emoji/1f438.svg' },
        ],
      },
      {
        name: 'pride flag',
        msgOriginal: '🏳️‍🌈',
        context: {},
        channel: '#robyottoko',
        expected: [
          { url: 'https://cdn.betterttv.net/assets/emoji/1f3f3-fe0f-200d-1f308.svg' },
        ],
      },
      {
        name: 'trans flag',
        msgOriginal: '🏳️‍⚧️',
        context: {},
        channel: '#robyottoko',
        expected: [
          { url: 'https://cdn.betterttv.net/assets/emoji/1f3f3-fe0f-200d-26a7-fe0f.svg' },
        ],
      },
      {
        name: 'ukraine flag',
        msgOriginal: '🇺🇦',
        context: {},
        channel: '#robyottoko',
        expected: [
          { url: 'https://cdn.betterttv.net/assets/emoji/1f1fa-1f1e6.svg' },
        ],
      },
      {
        name: 'twitch emotes',
        msgOriginal: 'blub bla bla',
        context: {
          emotes: {
            emotesv2_6087b156a30f4741a1d96acdc39e1905: [ '0-9', '10-19' ],
          },
        },
        channel: '#robyottoko',
        expected: [
          { url: 'https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_6087b156a30f4741a1d96acdc39e1905/default/dark/3.0' },
          { url: 'https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_6087b156a30f4741a1d96acdc39e1905/default/dark/3.0' },
        ],
      },
    ]

    testCases.forEach(({ name, msgOriginal, context, channel, expected }) => it(name, () => {
      const emoteParser = new EmoteParser()
      const actual = emoteParser.extractEmotes(msgOriginal, context, channel)
      expect(actual).toStrictEqual(expected)
    }))
  })
})
