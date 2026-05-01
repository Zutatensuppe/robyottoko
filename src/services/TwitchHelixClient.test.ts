import { afterEach, describe, expect, it, vi } from 'vitest'
import xhr from '../net/xhr'
import { getBestEntryFromCategorySearchItems, TwitchHelixClient } from './TwitchHelixClient'

const createTokenResponse = (token: string) => ({
  ok: true,
  json: vi.fn().mockResolvedValue({
    access_token: token,
    refresh_token: '',
    expires_in: 3600,
    scope: [],
    token_type: 'bearer',
  }),
  text: vi.fn().mockResolvedValue(''),
}) as any

afterEach(() => {
  vi.restoreAllMocks()
})

describe('src/services/TwitchHelixClient.ts', () => {
  describe('getBestEntryFromCategorySearchItems', () => {
    const testCases = [
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
    ]

    testCases.forEach(({ searchString, resp, expected }) => it('getBestEntryFromCategorySearchItems', () => {
      const actual = getBestEntryFromCategorySearchItems(searchString, resp)
      expect(actual).toStrictEqual(expected)
    }))
  })

  describe('app access token caching', () => {
    it('reuses cached app access token for repeated calls of same client id', async () => {
      const clientId = `client-cache-${Date.now()}`
      const postSpy = vi.spyOn(xhr, 'post').mockResolvedValue(createTokenResponse('token-1'))
      const client = new TwitchHelixClient(clientId, 'secret')

      const token1 = await (client as any).getAccessToken()
      const token2 = await (client as any).getAccessToken()

      expect(token1).toBe('token-1')
      expect(token2).toBe('token-1')
      expect(postSpy).toHaveBeenCalledTimes(1)
    })

    it('shares in-flight token fetch across client instances with same client id', async () => {
      const clientId = `client-shared-${Date.now()}`
      let resolveFetch: ((value: any) => void) | undefined
      const fetchPromise = new Promise<any>((resolve) => {
        resolveFetch = resolve
      })
      const postSpy = vi.spyOn(xhr, 'post').mockImplementation(async () => await fetchPromise)

      const clientA = new TwitchHelixClient(clientId, 'secret')
      const clientB = new TwitchHelixClient(clientId, 'secret')

      const tokenPromiseA = (clientA as any).getAccessToken()
      const tokenPromiseB = (clientB as any).getAccessToken()

      await Promise.resolve()
      expect(postSpy).toHaveBeenCalledTimes(1)

      if (resolveFetch) {
        resolveFetch(createTokenResponse('token-shared'))
      }
      const [tokenA, tokenB] = await Promise.all([tokenPromiseA, tokenPromiseB])

      expect(tokenA).toBe('token-shared')
      expect(tokenB).toBe('token-shared')
      expect(postSpy).toHaveBeenCalledTimes(1)
    })

    it('does not share app access tokens between different client ids', async () => {
      const postSpy = vi.spyOn(xhr, 'post')
        .mockResolvedValueOnce(createTokenResponse('token-a'))
        .mockResolvedValueOnce(createTokenResponse('token-b'))

      const clientA = new TwitchHelixClient(`client-a-${Date.now()}`, 'secret')
      const clientB = new TwitchHelixClient(`client-b-${Date.now()}`, 'secret')

      const tokenA = await (clientA as any).getAccessToken()
      const tokenB = await (clientB as any).getAccessToken()

      expect(tokenA).toBe('token-a')
      expect(tokenB).toBe('token-b')
      expect(postSpy).toHaveBeenCalledTimes(2)
    })

    it('briefly backs off after token endpoint failure', async () => {
      const clientId = `client-failure-${Date.now()}`
      const failedResponse = {
        ok: false,
        text: vi.fn().mockResolvedValue('rate limited'),
        json: vi.fn(),
      } as any
      const postSpy = vi.spyOn(xhr, 'post').mockResolvedValue(failedResponse)
      const client = new TwitchHelixClient(clientId, 'secret')

      const token1 = await (client as any).getAccessToken()
      const token2 = await (client as any).getAccessToken()

      expect(token1).toBe('')
      expect(token2).toBe('')
      expect(postSpy).toHaveBeenCalledTimes(1)
    })
  })
})
