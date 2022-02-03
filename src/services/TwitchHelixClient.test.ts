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
      ]
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
      ]
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
      ]
    },
    expected: { name: 'retho', id: '1', box_art_url: '' },
  },
  {
    searchString: 'oth',
    resp: {
      data: [
        { name: 'other stuff', id: '1', box_art_url: '' },
        { name: 'some other stuff', id: '1', box_art_url: '' },
        { name: 'other', id: '1', box_art_url: '' },
      ]
    },
    expected: { name: 'other', id: '1', box_art_url: '' },
  },
])('getBestEntryFromCategorySearchItems', ({ searchString, resp, expected }) => {
  const actual = getBestEntryFromCategorySearchItems(searchString, resp)
  expect(actual).toStrictEqual(expected)
})
