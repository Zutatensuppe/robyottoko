import { PlaylistItem } from "../../types"
import { findInsertIndex } from "./SongrequestModule"

describe('SongrequestModule', () => {
  const playlistItem = (plays: number) => ({
    id: 0,
    tags: [],
    yt: 'bla',
    title: 'bla',
    timestamp: 0,
    hidevideo: false,
    last_play: -1,
    plays,
    goods: 0,
    bads: 0,
    user: 'bla',
  })

  test.each([
    {
      name: 'empty playlist',
      playlist: [],
      expected: 0,
    },
    {
      name: 'non-played-at-beginning',
      playlist: [
        playlistItem(0),
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
  ])('findInsertIndex $name', ({ name, playlist, expected }: { name: string, playlist: PlaylistItem[], expected: number }) => {
    const actual = findInsertIndex(playlist)
    expect(actual).toBe(expected)
  })
})
