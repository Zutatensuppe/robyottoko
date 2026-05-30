import { describe, expect, it, vi } from 'vitest'
import Widgets from './Widgets'
import { WIDGET_TYPE } from '../enums'

const mockToken = { token: 'abc123', user_id: 1, type: 'widget_sr' }

const mockRepos = () => ({
  token: {
    getByUserIdAndType: vi.fn().mockResolvedValue(mockToken),
    delete: vi.fn().mockResolvedValue(undefined),
    createToken: vi.fn().mockResolvedValue({ token: 'new456', user_id: 1, type: 'widget_sr' }),
  },
  pub: {
    getByTarget: vi.fn().mockResolvedValue(null),
    getById: vi.fn().mockResolvedValue(null),
    insert: vi.fn().mockResolvedValue(undefined),
  },
} as any)

describe('Widgets', () => {
  describe('getWidgetUrl', () => {
    it('returns absolute URL with baseUrl prepended', async () => {
      const repos = mockRepos()
      const widgets = new Widgets(repos, 'https://example.com')
      const url = await widgets.getWidgetUrl(WIDGET_TYPE.SR, 1)
      expect(url).toBe('https://example.com/widget/sr/abc123/')
    })

    it('creates a token if none exists', async () => {
      const repos = mockRepos()
      repos.token.getByUserIdAndType.mockResolvedValue(null)
      repos.token.createToken.mockResolvedValue({ token: 'new456', user_id: 1, type: 'widget_sr' })
      const widgets = new Widgets(repos, 'http://localhost:1337')
      const url = await widgets.getWidgetUrl(WIDGET_TYPE.SR, 1)
      expect(url).toBe('http://localhost:1337/widget/sr/new456/')
      expect(repos.token.createToken).toHaveBeenCalledWith(1, 'widget_sr')
    })
  })

  describe('createWidgetUrl', () => {
    it('deletes old token and returns new absolute URL', async () => {
      const repos = mockRepos()
      const widgets = new Widgets(repos, 'https://example.com')
      const url = await widgets.createWidgetUrl('sr', 1, false)
      expect(repos.token.delete).toHaveBeenCalledWith('abc123')
      expect(url).toBe('https://example.com/widget/sr/new456/')
    })

    it('returns public URL when pub is true', async () => {
      const repos = mockRepos()
      const widgets = new Widgets(repos, 'https://example.com')
      const url = await widgets.createWidgetUrl('sr', 1, true)
      expect(url).toMatch(/^https:\/\/example\.com\/pub\//)
      expect(repos.pub.insert).toHaveBeenCalled()
      // target stored in pub table should be the relative path
      const insertCall = repos.pub.insert.mock.calls[0][0]
      expect(insertCall.target).toBe('/widget/sr/new456/')
    })
  })

  describe('getPublicWidgetUrl', () => {
    it('stores relative path as target in pub table', async () => {
      const repos = mockRepos()
      const widgets = new Widgets(repos, 'https://example.com')
      const url = await widgets.getPublicWidgetUrl(WIDGET_TYPE.SR, 1)
      expect(url).toMatch(/^https:\/\/example\.com\/pub\//)
      const insertCall = repos.pub.insert.mock.calls[0][0]
      expect(insertCall.target).toBe('/widget/sr/abc123/')
    })
  })

  describe('getWidgetInfos', () => {
    it('returns absolute URLs for all widgets', async () => {
      const repos = mockRepos()
      const widgets = new Widgets(repos, 'https://example.com')
      const infos = await widgets.getWidgetInfos(1)
      for (const info of infos) {
        expect(info.url).toMatch(/^https:\/\/example\.com\//)
      }
    })
  })

  describe('getModuleTypeByWsPath', () => {
    it('returns the module name for a valid widget ws path', () => {
      const repos = mockRepos()
      const widgets = new Widgets(repos, 'https://example.com')
      expect(widgets.getModuleTypeByWsPath('/widget_sr')).toBe('sr')
      expect(widgets.getModuleTypeByWsPath('/widget_media')).toBe('general')
      expect(widgets.getModuleTypeByWsPath('/widget_pomo')).toBe('pomo')
    })

    it('returns null for an unknown widget type', () => {
      const repos = mockRepos()
      const widgets = new Widgets(repos, 'https://example.com')
      expect(widgets.getModuleTypeByWsPath('/widget_unknown')).toBeNull()
    })

    it('returns null for a path without the widget prefix', () => {
      const repos = mockRepos()
      const widgets = new Widgets(repos, 'https://example.com')
      expect(widgets.getModuleTypeByWsPath('/general')).toBeNull()
      expect(widgets.getModuleTypeByWsPath('')).toBeNull()
    })
  })
})
