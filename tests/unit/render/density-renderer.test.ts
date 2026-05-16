import { describe, expect, it } from 'vitest'

import { DensityRenderer } from '../../../src/render/densityRenderer'
import { Grid } from '../../../src/sim/Grid'

describe('DensityRenderer', () => {
  it('maps density values into ImageData pixels and writes them to the context', () => {
    const renderer = new DensityRenderer({ densityScale: 0.5 })
    const density = new Grid(2)
    density.set(1, 1, 2)
    density.set(2, 1, 1)
    density.set(1, 2, 0.5)

    let lastImageData:
      | { data: Uint8ClampedArray; width: number; height: number }
      | undefined

    const context = {
      canvas: { width: 2, height: 2 } as HTMLCanvasElement,
      createImageData(width: number, height: number) {
        return {
          data: new Uint8ClampedArray(width * height * 4),
          width,
          height,
        }
      },
      putImageData(imageData: {
        data: Uint8ClampedArray
        width: number
        height: number
      }) {
        lastImageData = imageData
      },
    }

    renderer.render(context, density)

    expect(lastImageData).toBeDefined()
    expect(lastImageData?.data).toHaveLength(16)
    expect(lastImageData?.data[3]).toBeGreaterThan(200)
    expect(lastImageData?.data[7]).toBeGreaterThan(100)
    expect(lastImageData?.data[11]).toBeGreaterThan(60)
    expect(lastImageData?.data[15]).toBeGreaterThan(20)
  })
})
