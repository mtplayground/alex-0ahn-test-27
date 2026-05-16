import { DEFAULT_DENSITY_RENDER_SCALE } from '../config/defaults'
import { Grid } from '../sim/Grid'
import { type RenderTheme, waterBlueTheme } from './palette'

interface DensityRendererOptions {
  theme?: RenderTheme
  densityScale?: number
}

interface ImageDataLike {
  readonly data: Uint8ClampedArray
  readonly width: number
  readonly height: number
}

interface RenderContext {
  canvas: HTMLCanvasElement
  createImageData(width: number, height: number): ImageDataLike
  putImageData(imageData: ImageDataLike, dx: number, dy: number): void
}

export class DensityRenderer {
  private imageData: ImageDataLike | null = null
  private theme: RenderTheme
  private readonly densityScale: number

  constructor({
    theme = waterBlueTheme,
    densityScale = DEFAULT_DENSITY_RENDER_SCALE,
  }: DensityRendererOptions = {}) {
    if (!Number.isFinite(densityScale) || densityScale <= 0) {
      throw new Error('densityScale must be a positive finite number.')
    }

    this.theme = theme
    this.densityScale = densityScale
  }

  render(context: RenderContext, density: Grid): void {
    const width = context.canvas.width
    const height = context.canvas.height

    if (width <= 0 || height <= 0) {
      return
    }

    const imageData = this.getImageData(context, width, height)
    const pixels = imageData.data

    for (let y = 0; y < height; y += 1) {
      const sampleY = ((y + 0.5) / height) * density.size + 0.5

      for (let x = 0; x < width; x += 1) {
        const sampleX = ((x + 0.5) / width) * density.size + 0.5
        const value =
          bilinearSample(density, sampleX, sampleY) * this.densityScale
        const color = this.theme.mapDensity(value)
        const index = (y * width + x) * 4

        pixels[index] = color.red
        pixels[index + 1] = color.green
        pixels[index + 2] = color.blue
        pixels[index + 3] = color.alpha
      }
    }

    context.putImageData(imageData, 0, 0)
  }

  setTheme(theme: RenderTheme): void {
    this.theme = theme
  }

  private getImageData(
    context: RenderContext,
    width: number,
    height: number,
  ): ImageDataLike {
    if (
      this.imageData &&
      this.imageData.width === width &&
      this.imageData.height === height
    ) {
      return this.imageData
    }

    this.imageData = context.createImageData(width, height)
    return this.imageData
  }
}

function bilinearSample(grid: Grid, x: number, y: number): number {
  const x0 = clamp(Math.floor(x), 0, grid.size + 1)
  const x1 = clamp(x0 + 1, 0, grid.size + 1)
  const y0 = clamp(Math.floor(y), 0, grid.size + 1)
  const y1 = clamp(y0 + 1, 0, grid.size + 1)

  const sx = x - x0
  const sy = y - y0
  const left = lerp(grid.get(x0, y0), grid.get(x0, y1), sy)
  const right = lerp(grid.get(x1, y0), grid.get(x1, y1), sy)

  return lerp(left, right, sx)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
