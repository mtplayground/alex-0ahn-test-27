export interface CanvasViewport {
  width: number
  height: number
  devicePixelRatio: number
}

interface ResizeCanvasOptions {
  width: number
  height: number
  devicePixelRatio: number
}

export function resizeCanvasToDisplaySize(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  { width, height, devicePixelRatio }: ResizeCanvasOptions,
): CanvasViewport {
  const safeWidth = Math.max(1, Math.floor(width))
  const safeHeight = Math.max(1, Math.floor(height))
  const safeDevicePixelRatio = Math.max(1, devicePixelRatio)

  canvas.width = Math.floor(safeWidth * safeDevicePixelRatio)
  canvas.height = Math.floor(safeHeight * safeDevicePixelRatio)
  canvas.style.width = `${safeWidth}px`
  canvas.style.height = `${safeHeight}px`

  context.setTransform(safeDevicePixelRatio, 0, 0, safeDevicePixelRatio, 0, 0)
  context.imageSmoothingEnabled = false

  return {
    width: safeWidth,
    height: safeHeight,
    devicePixelRatio: safeDevicePixelRatio,
  }
}
