import { PlaylistItem } from '../../types'
import { findInsertIndex, moveTagUp } from './SongrequestModule'

describe('SongrequestModule', () => {

  describe('findInsertIndex', () => {

    const playlistItem = (plays: number) => ({
      id: 0,
      tags: [],
      yt: 'bla',
      title: 'bla',
      timestamp: 0,
      durationMs: 10,
      hidevideo: false,
      last_play: -1,
      plays,
      goods: 0,
      bads: 0,
      user: 'bla',
    })

    const testCases = [
      {
        name: 'empty playlist',
        playlist: [],
        expected: 0,
      },
      {
        name: 'no-non-played',
        playlist: [
          playlistItem(1),
          playlistItem(1),
          playlistItem(1),
        ],
        // should be inserted at position 1, because song a pos 0 is still playing
        expected: 1,
      },
      {
        name: 'non-played-at-beginning',
        playlist: [
          playlistItem(0),
          playlistItem(1),
          playlistItem(1),
        ],
        expected: 1,
      },
      {
        name: 'non-played-in-the-middle',
        playlist: [
          playlistItem(1),
          playlistItem(0),
          playlistItem(1),
        ],
        expected: 2,
      },
      {
        name: 'non-played-at-end',
        playlist: [
          playlistItem(1),
          playlistItem(1),
          playlistItem(0),
        ],
        expected: 3,
      },
    ]
  
    test.each(testCases)('findInsertIndex $name', ({ name, playlist, expected }: { name: string, playlist: PlaylistItem[], expected: number }) => {
      const actual = findInsertIndex(playlist)
      expect(actual).toBe(expected)
    })
  })

  describe('moveTagUp', () => {
    const testCases = [
      {
        name: 'empty',
        playlist: [],
        tag: 'flup',
        expected: [],
      },
      {
        name: 'no match, no change',
        playlist: [{ tags: ['lol'] }, { tags: ['zuzu'] }] as PlaylistItem[],
        tag: 'flup',
        expected: [{ tags: ['lol'] }, { tags: ['zuzu'] }] as PlaylistItem[],
      },
      {
        name: 'match, move up',
        playlist: [{ tags: ['lol'] }, { tags: ['zuzu', 'flup'] }, { tags: ['aa', 'flup'] }] as PlaylistItem[],
        tag: 'flup',
        expected: [{ tags: ['zuzu', 'flup'] }, { tags: ['aa', 'flup'] }, { tags: ['lol'] }] as PlaylistItem[],
      },
    ]

    test.each(testCases)('moveTagUp $name', ({ name, playlist, tag, expected }: { name: string, playlist: PlaylistItem[], tag: string, expected: PlaylistItem[] }) => {
      moveTagUp(playlist, tag)
      expect(playlist).toStrictEqual(expected)
    })
  })
})
