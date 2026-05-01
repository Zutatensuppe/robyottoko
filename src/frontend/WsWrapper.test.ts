import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WsWrapper from './WsWrapper'

class FakeWebSocket {
  static instances: FakeWebSocket[] = []
  static OPEN = 1

  OPEN = FakeWebSocket.OPEN
  readyState = FakeWebSocket.OPEN
  onopen: ((event: any) => void) | null = null
  onclose: ((event: any) => void) | null = null
  onmessage: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
  sent: string[] = []

  constructor(
    public readonly _addr: string,
    public readonly _protocols: string,
  ) {
    FakeWebSocket.instances.push(this)
  }

  send(data: string) {
    this.sent.push(data)
  }

  close(code = 1000) {
    this.onclose?.({ code })
  }
}

describe('src/frontend/WsWrapper.ts', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    FakeWebSocket.instances = []
    vi.stubGlobal('WebSocket', FakeWebSocket as unknown as typeof WebSocket)
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('reconnects after transient disconnects', () => {
    const ws = new WsWrapper('ws://localhost/ws/core', 'some-token')
    ws.connect()
    expect(FakeWebSocket.instances).toHaveLength(1)

    FakeWebSocket.instances[0].onclose?.({ code: 1006 })
    vi.advanceTimersByTime(1000)

    expect(FakeWebSocket.instances).toHaveLength(2)
  })

  it('does not reconnect after auth failure disconnect', () => {
    const ws = new WsWrapper('ws://localhost/ws/core', 'some-token')
    ws.connect()
    expect(FakeWebSocket.instances).toHaveLength(1)

    FakeWebSocket.instances[0].onclose?.({ code: 4001 })
    vi.advanceTimersByTime(5000)

    expect(FakeWebSocket.instances).toHaveLength(1)
  })
})
