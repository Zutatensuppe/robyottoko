import { getBestEntryFromCategorySearchItems } from './TwitchHelixClient'
test.each([
  {
    searchString: 'other',
    resp: { data: [] },
    expected: null,
  },
  {
    searchString: 'other',
    resp: {
      data: [
        { name: 'others', id: '1', box_art_url: '' },
        { name: 'other stuff', id: '1', box_art_url: '' },
        { name: 'some other stuff', id: '1', box_art_url: '' },
        { name: 'other', id: '1', box_art_url: '' },
      ],
    },
    expected: { name: 'other', id: '1', box_art_url: '' },
  },
  {
    searchString: 'others',
    resp: {
      data: [
        { name: 'others', id: '1', box_art_url: '' },
        { name: 'other stuff', id: '1', box_art_url: '' },
        { name: 'some other stuff', id: '1', box_art_url: '' },
        { name: 'other', id: '1', box_art_url: '' },
      ],
    },
    expected: { name: 'others', id: '1', box_art_url: '' },
  },
  {
    searchString: 'others',
    resp: {
      data: [
        { name: 'other stuff', id: '1', box_art_url: '' },
        { name: 'some others stuff', id: '1', box_art_url: '' },
        { name: 'retho', id: '1', box_art_url: '' },
        { name: 'other', id: '1', box_art_url: '' },
      ],
    },
    expected: { name: 'some others stuff', id: '1', box_art_url: '' },
  },
  {
    searchString: 'osu',
    resp: {
      data: [
        {
          box_art_url: 'https://static-cdn.jtvnw.net/ttv-boxart/243-52x72.jpg',
          id: '243',
          name: 'Moero! Nekketsu Rhythm Damashii Osu! Tatakae! Ouendan 2',
        },
        {
          box_art_url: 'https://static-cdn.jtvnw.net/ttv-boxart/5878-52x72.jpg',
          id: '5878',
          name: 'Tamagotchi: Osutchi & Mesutchi',
        },
        {
          box_art_url: 'https://static-cdn.jtvnw.net/ttv-boxart/6436_IGDB-52x72.jpg',
          id: '6436',
          name: 'Osu! Tatakae! Ouendan',
        },
        {
          box_art_url: 'https://static-cdn.jtvnw.net/ttv-boxart/21465_IGDB-52x72.jpg',
          id: '21465',
          name: 'osu!',
        },
        {
          box_art_url: 'https://static-cdn.jtvnw.net/ttv-boxart/27234_IGDB-52x72.jpg',
          id: '27234',
          name: 'Osu!! Karate Bu',
        },
        {
          box_art_url: 'https://static-cdn.jtvnw.net/ttv-boxart/67815_IGDB-52x72.jpg',
          id: '67815',
          name: 'Ronnie O\'Sullivan\'s Snooker',
        },
        {
          box_art_url: 'https://static-cdn.jtvnw.net/ttv-boxart/505020-52x72.jpg',
          id: '505020',
          name: 'Henshin Inma Shoujo Karin: Midara na Akuma wa H ga Osuki',
        },
      ],
    },
    expected: {
      box_art_url: 'https://static-cdn.jtvnw.net/ttv-boxart/21465_IGDB-52x72.jpg',
      id: '21465',
      name: 'osu!',
    },
  },
  {
    searchString: 'food drink',
    resp: {
      data: [
        {
          box_art_url: 'https://static-cdn.jtvnw.net/ttv-boxart/509567-52x72.jpg',
          id: '509567',
          name: 'Food Drive',
        },
        {
          box_art_url: 'https://static-cdn.jtvnw.net/ttv-boxart/509667-52x72.jpg',
          id: '509667',
          name: 'Food & Drink',
        },
        {
          box_art_url: 'https://static-cdn.jtvnw.net/ttv-boxart/696400368_IGDB-52x72.jpg',
          id: '696400368',
          name: 'Food Girls - Bubbles\' Drink Stand VR',
        },
      ],
    },
    expected: {
      box_art_url: 'https://static-cdn.jtvnw.net/ttv-boxart/509667-52x72.jpg',
      id: '509667',
      name: 'Food & Drink',
    },
  },
  {
    searchString: '4-2',
    resp: {
      data: [
        { name: 'В мире животных — заставка (1974-2000) [480p]', id: '1', box_art_url: '' },
        { name: 'Ninja Gaiden 4-2: Unbreakable Determination (piano cover)', id: '2', box_art_url: '' },
      ],
    },
    expected: { name: 'Ninja Gaiden 4-2: Unbreakable Determination (piano cover)', id: '2', box_art_url: '' },
  },
  {
    searchString: 'other',
    resp: {
      data: [
        {
          box_art_url: 'https://static-cdn.jtvnw.net/ttv-boxart/5316-52x72.jpg',
          id: '5316',
          name: 'Other Worlds',
        },
        {
          box_art_url: 'https://static-cdn.jtvnw.net/ttv-boxart/21713-52x72.jpg',
          id: '21713',
          name: 'Otherland',
        },
        {
          box_art_url: 'https://static-cdn.jtvnw.net/ttv-boxart/509354-52x72.jpg',
          id: '509354',
          name: 'Otherworld: Shades of Fall',
        },
        {
          box_art_url: 'https://static-cdn.jtvnw.net/ttv-boxart/511910_IGDB-52x72.jpg',
          id: '511910',
          name: 'Othercide',
        },
        {
          box_art_url: 'https://static-cdn.jtvnw.net/ttv-boxart/512354-52x72.jpg',
          id: '512354',
          name: 'Others',
        },
      ],
    },
    expected: {
      box_art_url: 'https://static-cdn.jtvnw.net/ttv-boxart/512354-52x72.jpg',
      id: '512354',
      name: 'Others',
    },
  },
])('getBestEntryFromCategorySearchItems', ({ searchString, resp, expected }) => {
  const actual = getBestEntryFromCategorySearchItems(searchString, resp)
  expect(actual).toStrictEqual(expected)
})
