// TODO: think of a better name
export class Timer {
  private splits: number[] = []

  public reset(): void {
    this.splits = []
    this.split()
  }

  public split(): void {
    this.splits.push(performance.now())
  }

  public lastSplitMs(): number {
    const len = this.splits.length
    if (len < 2) {
      return NaN
    }
    return this.splits[len - 1] - this.splits[len - 2]
  }

  public totalMs(): number {
    const len = this.splits.length
    if (len < 2) {
      return NaN
    }
    return this.splits[len - 1] - this.splits[0]
  }
}
