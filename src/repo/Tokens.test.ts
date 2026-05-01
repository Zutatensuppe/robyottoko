import { describe, expect, it, vi } from 'vitest'
import { generateToken } from './Tokens'
import Tokens, { TokenType } from './Tokens'
import type Db from '../DbPostgres'

describe('src/repo/Tokens.ts', () => {
  describe('generateToken', () => {
    const ALLOWED = /^[a-zA-Z0-9]*$/

    it('returns a string of the requested length', () => {
      expect(generateToken(32)).toHaveLength(32)
      expect(generateToken(64)).toHaveLength(64)
      expect(generateToken(1)).toHaveLength(1)
    })

    it('returns an empty string for length 0', () => {
      expect(generateToken(0)).toBe('')
    })

    it('works for large lengths', () => {
      const token = generateToken(256)
      expect(token).toHaveLength(256)
      expect(token).toMatch(ALLOWED)
    })

    it('contains only alphanumeric characters', () => {
      for (let i = 0; i < 20; i++) {
        expect(generateToken(32)).toMatch(ALLOWED)
      }
    })

    it('produces different tokens on consecutive calls', () => {
      const tokens = new Set<string>()
      for (let i = 0; i < 50; i++) {
        tokens.add(generateToken(32))
      }
      // With 62^32 possible tokens, collisions are astronomically unlikely
      expect(tokens.size).toBe(50)
    })

    it('uses cryptographic randomness (not Math.random)', () => {
      const mathRandomSpy = vi.spyOn(Math, 'random')
      generateToken(32)
      expect(mathRandomSpy).not.toHaveBeenCalled()
      mathRandomSpy.mockRestore()
    })
  })

  describe('Tokens repo', () => {
    function createMockDb(store: Record<string, any[]> = {}) {
      return {
        get: vi.fn(async (_table: string, where: Record<string, any>) => {
          const rows = store[_table] || []
          return rows.find((row) =>
            Object.entries(where).every(([k, v]) => row[k] === v),
          ) || null
        }),
        insert: vi.fn(async (_table: string, row: Record<string, any>) => {
          if (!store[_table]) store[_table] = []
          store[_table].push(row)
          return store[_table].length
        }),
        delete: vi.fn(async (_table: string, where: Record<string, any>) => {
          if (!store[_table]) return 0
          const before = store[_table].length
          store[_table] = store[_table].filter((row) =>
            !Object.entries(where).every(([k, v]) => row[k] === v),
          )
          return before - store[_table].length
        }),
      } as unknown as Db
    }

    it('createToken inserts and returns a valid token', async () => {
      const store: Record<string, any[]> = {}
      const db = createMockDb(store)
      const tokens = new Tokens(db)

      const result = await tokens.createToken(1, TokenType.AUTH)

      expect(result).toEqual({
        user_id: 1,
        type: TokenType.AUTH,
        token: expect.any(String),
      })
      expect(result.token).toHaveLength(32)
      expect(db.insert).toHaveBeenCalledOnce()
      expect(store['robyottoko.token']).toHaveLength(1)
    })

    it('getOrCreateToken returns existing token if present', async () => {
      const existingToken = { user_id: 1, type: TokenType.AUTH, token: 'existing123' }
      const store: Record<string, any[]> = { 'robyottoko.token': [existingToken] }
      const db = createMockDb(store)
      const tokens = new Tokens(db)

      const result = await tokens.getOrCreateToken(1, TokenType.AUTH)

      expect(result).toEqual(existingToken)
      expect(db.insert).not.toHaveBeenCalled()
    })

    it('getOrCreateToken creates a new token if none exists', async () => {
      const store: Record<string, any[]> = {}
      const db = createMockDb(store)
      const tokens = new Tokens(db)

      const result = await tokens.getOrCreateToken(1, TokenType.API_KEY)

      expect(result.user_id).toBe(1)
      expect(result.type).toBe(TokenType.API_KEY)
      expect(result.token).toHaveLength(32)
      expect(db.insert).toHaveBeenCalledOnce()
    })

    it('generateAuthTokenForUserId creates an AUTH token', async () => {
      const store: Record<string, any[]> = {}
      const db = createMockDb(store)
      const tokens = new Tokens(db)

      const result = await tokens.generateAuthTokenForUserId(42)

      expect(result.user_id).toBe(42)
      expect(result.type).toBe(TokenType.AUTH)
      expect(result.token).toHaveLength(32)
    })

    it('delete removes a token', async () => {
      const token = { user_id: 1, type: TokenType.AUTH, token: 'to-delete' }
      const store: Record<string, any[]> = { 'robyottoko.token': [token] }
      const db = createMockDb(store)
      const tokens = new Tokens(db)

      await tokens.delete('to-delete')

      expect(db.delete).toHaveBeenCalledWith('robyottoko.token', { token: 'to-delete' })
    })

    it('getByTokenAndType returns null when not found', async () => {
      const db = createMockDb()
      const tokens = new Tokens(db)

      const result = await tokens.getByTokenAndType('nonexistent', TokenType.AUTH)

      expect(result).toBeNull()
    })
  })
})
