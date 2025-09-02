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

  public lastSplitMs(): string {
    const len = this.splits.length
    if (len < 2) {
      return 'NaN'
    }
    return (this.splits[len - 1] - this.splits[len - 2]).toFixed(2)
  }

  public totalMs(): string {
    const len = this.splits.length
    if (len < 2) {
      return 'NaN'
    }
    return (this.splits[len - 1] - this.splits[0]).toFixed(2)
  }
}
