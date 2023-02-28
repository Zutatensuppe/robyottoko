import { PlaylistItem } from "../../types"
import { isItemShown, SongRequestModuleFilter } from "./SongrequestModuleCommon"

describe('SongrequestModuleCommon', () => {
  describe('isItemShown', () => {
    const testCases = [
      {
        name: 'item no tags, no filters',
        item: { tags: [] } as unknown as PlaylistItem,
        filter: { show: { tags: [] }, hide: { tags: [] }} as SongRequestModuleFilter,
        expected: true,
      },
      {
        name: 'item has tags, no filters',
        item: { tags: ['hoho'] } as unknown as PlaylistItem,
        filter: { show: { tags: [] }, hide: { tags: [] }} as SongRequestModuleFilter,
        expected: true,
      },
      {
        name: 'item has tags, show filters active, not matching',
        item: { tags: ['hoho'] } as unknown as PlaylistItem,
        filter: { show: { tags: ['muh'] }, hide: { tags: [] }} as SongRequestModuleFilter,
        expected: false,
      },
      {
        name: 'item has tags, hide filters active, not matching',
        item: { tags: ['hoho'] } as unknown as PlaylistItem,
        filter: { show: { tags: [] }, hide: { tags: ['muh'] }} as SongRequestModuleFilter,
        expected: true,
      },
      {
        name: 'item has tags, hide filters active, matching',
        item: { tags: ['muh'] } as unknown as PlaylistItem,
        filter: { show: { tags: [] }, hide: { tags: ['muh'] }} as SongRequestModuleFilter,
        expected: false,
      },
      {
        name: 'item has tags, hide and show filters active, both matching',
        item: { tags: ['muh', 'robo'] } as unknown as PlaylistItem,
        filter: { show: { tags: ['robo'] }, hide: { tags: ['muh'] }} as SongRequestModuleFilter,
        expected: true,
      },
    ]

    testCases.forEach(({ name, item, filter, expected }) => it(name, () => {
      const actual = isItemShown(item, filter)
      expect(actual).toBe(expected)
    }))
  })
})
