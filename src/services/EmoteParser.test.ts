import { ChatMessageContext } from '../types'
import { EmoteParser } from './EmoteParser'


describe('services/EmoteParser', () => {
  test.each([
    {
      _name: 'no emotes',
      ctx: {
        msgOriginal: 'lalahdlfadofho  sadf ',
        msgNormalized: 'lalahdlfadofho  sadf ',
        context: {},
        target: '#robyottoko',
      },
      expected: [],
    },
    {
      _name: 'unicode emotes 1',
      ctx: {
        msgOriginal: '👩‍⚕️',
        msgNormalized: '👩‍⚕️',
        context: {},
        target: '#robyottoko',
      },
      expected: [
        { url: 'https://cdn.betterttv.net/assets/emoji/1f469-200d-2695-fe0f.svg' },
      ],
    },
    {
      _name: 'unicode emotes 2',
      ctx: {
        msgOriginal: ' 👨‍👩‍👧‍👦 ',
        msgNormalized: ' 👨👩👧👦 ',
        context: {},
        target: '#robyottoko',
      },
      expected: [
        { url: 'https://cdn.betterttv.net/assets/emoji/1f468-200d-1f469-200d-1f467-200d-1f466.svg' },
      ],
    },
    {
      _name: 'unicode emotes 2 alternative',
      ctx: {
        msgOriginal: ' 👨👩👧👦 ',
        msgNormalized: ' 👨👩👧👦 ',
        context: {},
        target: '#robyottoko',
      },
      expected: [
        { url: 'https://cdn.betterttv.net/assets/emoji/1f468.svg' },
        { url: 'https://cdn.betterttv.net/assets/emoji/1f469.svg' },
        { url: 'https://cdn.betterttv.net/assets/emoji/1f467.svg' },
        { url: 'https://cdn.betterttv.net/assets/emoji/1f466.svg' },
      ],
    },
    {
      _name: 'unicode emotes 3',
      ctx: {
        msgOriginal: '👨‍🦲',
        msgNormalized: '👨🦲',
        context: {},
        target: '#robyottoko',
      },
      expected: [
        { url: 'https://cdn.betterttv.net/assets/emoji/1f468-200d-1f9b2.svg' },
      ],
    },
    {
      _name: 'unicode emotes 3 alternative',
      ctx: {
        msgOriginal: '👨🦲',
        msgNormalized: '👨🦲',
        context: {},
        target: '#robyottoko',
      },
      expected: [
        { url: 'https://cdn.betterttv.net/assets/emoji/1f468.svg' },
        { url: 'https://cdn.betterttv.net/assets/emoji/1f9b2.svg' },
      ],
    },
    {
      _name: 'unicode emotes 4',
      ctx: {
        msgOriginal: ' 🙇‍♀️ ',
        msgNormalized: ' 🙇♀️ ',
        context: {},
        target: '#robyottoko',
      },
      expected: [
        { url: 'https://cdn.betterttv.net/assets/emoji/1f647-200d-2640-fe0f.svg' },
      ],
    },
    {
      _name: 'unicode emotes 4 alternative',
      ctx: {
        msgOriginal: ' 🙇♀️ ',
        msgNormalized: ' 🙇♀️ ',
        context: {},
        target: '#robyottoko',
      },
      expected: [
        { url: 'https://cdn.betterttv.net/assets/emoji/1f647.svg' },
        { url: 'https://cdn.betterttv.net/assets/emoji/2640.svg' },
      ],
    },
    {
      _name: 'unicode emotes 5',
      ctx: {
        msgOriginal: '🍀🍀🐸',
        msgNormalized: '🍀🍀🐸',
        context: {},
        target: '#robyottoko',
      },
      expected: [
        { url: 'https://cdn.betterttv.net/assets/emoji/1f340.svg' },
        { url: 'https://cdn.betterttv.net/assets/emoji/1f340.svg' },
        { url: 'https://cdn.betterttv.net/assets/emoji/1f438.svg' },
      ],
    },
    {
      _name: 'pride flag',
      ctx: {
        msgOriginal: '🏳️‍🌈',
        msgNormalized: '🏳️‍🌈',
        context: {},
        target: '#robyottoko',
      },
      expected: [
        { url: 'https://cdn.betterttv.net/assets/emoji/1f3f3-fe0f-200d-1f308.svg' },
      ],
    },
    {
      _name: 'trans flag',
      ctx: {
        msgOriginal: '🏳️‍⚧️',
        msgNormalized: '🏳️‍⚧️',
        context: {},
        target: '#robyottoko',
      },
      expected: [
        { url: 'https://cdn.betterttv.net/assets/emoji/1f3f3-fe0f-200d-26a7-fe0f.svg' },
      ],
    },
    {
      _name: 'ukraine flag',
      ctx: {
        msgOriginal: '🇺🇦',
        msgNormalized: '🇺🇦',
        context: {},
        target: '#robyottoko',
      },
      expected: [
        { url: 'https://cdn.betterttv.net/assets/emoji/1f1fa-1f1e6.svg' },
      ],
    },
    {
      _name: 'twitch emotes',
      ctx: {
        msgOriginal: 'blub bla bla',
        msgNormalized: 'blub bla bla',
        context: {
          emotes: {
            emotesv2_6087b156a30f4741a1d96acdc39e1905: [ '0-9', '10-19' ],
          },
        },
        target: '#robyottoko',
      },
      expected: [
        { url: 'https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_6087b156a30f4741a1d96acdc39e1905/default/dark/3.0' },
        { url: 'https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_6087b156a30f4741a1d96acdc39e1905/default/dark/3.0' },
      ],
    },
  ])('$_name', ({ _name, ctx, expected }) => {
    const emoteParser = new EmoteParser()
    const actual = emoteParser.extractEmotes(ctx as ChatMessageContext)
    expect(actual).toStrictEqual(expected)
  })
})
