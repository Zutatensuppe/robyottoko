import { afterEach, describe, expect, it, vi } from 'vitest'
import { Timer } from './Timer'

describe('src/Timer.ts', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns incremental split times and total time', () => {
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(100) // reset()
      .mockReturnValueOnce(115) // split()
      .mockReturnValueOnce(160) // split()

    const timer = new Timer()
    timer.reset()

    timer.split()
    expect(timer.lastSplitMs()).toBe('15.00')
    expect(timer.totalMs()).toBe('15.00')

    timer.split()
    expect(timer.lastSplitMs()).toBe('45.00')
    expect(timer.totalMs()).toBe('60.00')
  })

  it('reset starts a fresh measurement window', () => {
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(200) // reset()
      .mockReturnValueOnce(230) // split()
      .mockReturnValueOnce(1000) // reset()
      .mockReturnValueOnce(1040) // split()

    const timer = new Timer()
    timer.reset()
    timer.split()
    expect(timer.totalMs()).toBe('30.00')

    timer.reset()
    timer.split()
    expect(timer.totalMs()).toBe('40.00')
  })

  it('returns NaN before at least one split after reset', () => {
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(50) // reset()

    const timer = new Timer()
    timer.reset()

    expect(timer.lastSplitMs()).toBe('NaN')
    expect(timer.totalMs()).toBe('NaN')
  })
})
