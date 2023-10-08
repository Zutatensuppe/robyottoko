// by EDU! :p

export type WheelItem = {
  bias: number;
  color: string;
  title: string;
}

export type WheelTheme = {
  markerImage?: string;
  centerReflectionImage?: string;
  centerShadowImage?: string;
  centerImage?: string;
  centerRingImage?: string;
  outerImage?: string;
}

export type WheelItemProbability = {
  index: number;
  probability: number;
}

export type SpinResult = {
  rotation: number;
  winner: WheelItem;
}

const MIN_ITEMS_ON_WHEEL = 1

export function randomFloat (min: number, max: number): number {
  return Math.random() * (max - min) + min
}

export class RouletteWheel {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private items: WheelItem[] = []
  private itemProbabilities: WheelItemProbability[] = []

  public constructor (canvas: HTMLCanvasElement, items: WheelItem[]) {
    this.canvas = canvas

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no rendering context found')
    this.ctx = ctx

    this.items = this.fillWithItems(items)
    this.itemProbabilities = this.calculateItemProbabilities()
    this.draw()
  }

  private fillWithItems (items: WheelItem[]): WheelItem[] {
    if (items.length >= MIN_ITEMS_ON_WHEEL) return items
    const multiplier = Math.ceil(MIN_ITEMS_ON_WHEEL / items.length)
    const result = [...items]

    for (let i = 1; i < multiplier; i++) {
      result.push(...items)
    }

    return result
  }

  private calculateItemProbabilities (): WheelItemProbability[] {
    const totalBiasPoints = this.items.map(i => i.bias).reduce((a, v) => a + v, 0)

    // Calculate balance chance from biases
    const probabilities: WheelItemProbability[] = []
    this.items.forEach((i, index) => {
      probabilities.push({ index, probability: i.bias / totalBiasPoints })
    })

    return probabilities
  }

  public spin (): SpinResult {
    const targetSpin = Math.random() * Math.PI * 2
    const targetDegree = (targetSpin * 180 / Math.PI) - 90

    const winner = this.findWinner(targetSpin)

    return {
      rotation: targetDegree,
      winner,
    }
  }

  private findWinner (targetAngle: number): WheelItem {
    let winner: WheelItem | undefined
    let currentAngle = 0
    this.itemProbabilities.forEach(p => {
      if (!winner) {
        const portionAngle = (p.probability) * 2 * Math.PI
        if (targetAngle >= currentAngle && targetAngle < (currentAngle + portionAngle)) {
          winner = this.items[p.index]
        }
        currentAngle += portionAngle
      }
    })

    if (!winner) throw Error(`no winner found at ${targetAngle}`)
    return winner
  }

  private draw (): void {
    let currentAngle = 0
    this.itemProbabilities.forEach(p => {
      const portionAngle = (p.probability) * 2 * Math.PI

      // draw pie piece
      this.ctx.beginPath()
      this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 2, (currentAngle - Math.PI / 2), currentAngle + portionAngle - Math.PI / 2)
      this.ctx.lineTo(this.canvas.width / 2, this.canvas.height / 2)

      const item = this.items[p.index]
      this.ctx.fillStyle = item.color
      this.ctx.fill()

      // draw rotated text
      this.ctx.save()
      this.ctx.fillStyle = 'black'
      this.ctx.font = 'bold 30px Arial'
      this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2)
      this.ctx.rotate(currentAngle + portionAngle - Math.PI / 2 - ((p.probability / 2) * 2 * Math.PI))
      this.ctx.textAlign = 'right'
      this.ctx.globalCompositeOperation = 'soft-light'
      this.ctx.fillText(item.title, (this.canvas.width / 2) - 50, 6)
      this.ctx.globalCompositeOperation = 'source-over'
      this.ctx.globalAlpha = 0.5
      this.ctx.fillText(item.title, (this.canvas.width / 2) - 50, 6)
      this.ctx.restore()

      // Increase current angle for next iteration
      currentAngle += portionAngle
    })

    currentAngle = 0
    this.itemProbabilities.forEach(p => {
      const portionAngle = (p.probability) * 2 * Math.PI

      // draw stroke
      this.ctx.save()
      this.ctx.strokeStyle = 'white'
      this.ctx.lineWidth = 5
      this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2)
      this.ctx.rotate(currentAngle + portionAngle)
      this.ctx.beginPath()
      this.ctx.moveTo(0, 0)
      this.ctx.lineTo(0, -this.canvas.height / 2)
      this.ctx.stroke()
      this.ctx.restore()

      // Increase current angle for next iteration
      currentAngle += portionAngle
    })

    // draw stroke circle
    this.ctx.save()
    this.ctx.lineWidth = 5
    this.ctx.strokeStyle = 'white'
    this.ctx.beginPath()
    this.ctx.arc(this.canvas.width / 2, this.canvas.width / 2, (this.canvas.width / 2) - 20, 0, 2 * Math.PI)
    this.ctx.stroke()
    this.ctx.restore()

    // draw center circle
    this.ctx.save()
    this.ctx.fillStyle = 'white'
    this.ctx.beginPath()
    this.ctx.arc(this.canvas.width / 2, this.canvas.width / 2, 150, 0, 2 * Math.PI)
    this.ctx.fill()
    this.ctx.restore()
  }
}
