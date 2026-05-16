export interface AnimationFrameState {
  deltaMs: number
  fps: number
  timestamp: number
}

interface CreateAnimationLoopOptions {
  requestAnimationFrame: (callback: FrameRequestCallback) => number
  cancelAnimationFrame: (handle: number) => void
  onFrame: (state: AnimationFrameState) => void
}

export interface AnimationLoopController {
  start(): void
  stop(): void
}

export function createAnimationLoop({
  requestAnimationFrame,
  cancelAnimationFrame,
  onFrame,
}: CreateAnimationLoopOptions): AnimationLoopController {
  let frameHandle: number | null = null
  let lastTimestamp: number | null = null

  const tick: FrameRequestCallback = (timestamp) => {
    const deltaMs = lastTimestamp === null ? 16.67 : timestamp - lastTimestamp
    lastTimestamp = timestamp

    onFrame({
      deltaMs,
      fps: deltaMs > 0 ? 1000 / deltaMs : 0,
      timestamp,
    })

    frameHandle = requestAnimationFrame(tick)
  }

  return {
    start() {
      if (frameHandle !== null) {
        return
      }

      frameHandle = requestAnimationFrame(tick)
    },
    stop() {
      if (frameHandle === null) {
        return
      }

      cancelAnimationFrame(frameHandle)
      frameHandle = null
      lastTimestamp = null
    },
  }
}
