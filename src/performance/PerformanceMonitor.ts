interface PerformanceMonitorOptions {
  sampleSize?: number
  lowFpsThreshold?: number
  requiredLowSamples?: number
}

export interface PerformanceSnapshot {
  averageFps: number
  lowSampleStreak: number
  shouldDowngrade: boolean
}

export class PerformanceMonitor {
  private readonly sampleSize: number
  private readonly lowFpsThreshold: number
  private readonly requiredLowSamples: number
  private readonly samples: number[] = []
  private lowSampleStreak = 0

  constructor({
    sampleSize = 12,
    lowFpsThreshold = 45,
    requiredLowSamples = 3,
  }: PerformanceMonitorOptions = {}) {
    this.sampleSize = sampleSize
    this.lowFpsThreshold = lowFpsThreshold
    this.requiredLowSamples = requiredLowSamples
  }

  recordFrame(fps: number): PerformanceSnapshot {
    this.samples.push(fps)

    if (this.samples.length > this.sampleSize) {
      this.samples.shift()
    }

    const averageFps = this.getAverageFps()
    const hasFullWindow = this.samples.length === this.sampleSize

    if (hasFullWindow && averageFps < this.lowFpsThreshold) {
      this.lowSampleStreak += 1
    } else {
      this.lowSampleStreak = 0
    }

    return {
      averageFps,
      lowSampleStreak: this.lowSampleStreak,
      shouldDowngrade: this.lowSampleStreak >= this.requiredLowSamples,
    }
  }

  reset(): void {
    this.samples.length = 0
    this.lowSampleStreak = 0
  }

  getAverageFps(): number {
    if (this.samples.length === 0) {
      return 0
    }

    const total = this.samples.reduce((sum, value) => sum + value, 0)
    return total / this.samples.length
  }
}
