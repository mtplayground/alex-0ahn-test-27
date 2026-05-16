import { describe, expect, it } from 'vitest'

import { PerformanceMonitor } from '../../../src/performance/PerformanceMonitor'

describe('PerformanceMonitor', () => {
  it('requests a downgrade after repeated low-fps rolling windows', () => {
    const monitor = new PerformanceMonitor({
      sampleSize: 4,
      lowFpsThreshold: 45,
      requiredLowSamples: 2,
    })

    const snapshots = [20, 24, 22, 21, 23].map((fps) =>
      monitor.recordFrame(fps),
    )

    expect(snapshots.at(-1)?.shouldDowngrade).toBe(true)
    expect(snapshots.at(-1)?.averageFps).toBeLessThan(45)
  })

  it('resets its state when requested', () => {
    const monitor = new PerformanceMonitor()
    monitor.recordFrame(20)
    monitor.reset()

    expect(monitor.getAverageFps()).toBe(0)
  })
})
