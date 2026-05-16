export interface RGBAColor {
  red: number
  green: number
  blue: number
  alpha: number
}

export interface RenderTheme {
  mapDensity(value: number): RGBAColor
}

export const waterBlueTheme: RenderTheme = {
  mapDensity(value) {
    const intensity = clamp(value)
    const glow = Math.pow(intensity, 0.85)

    return {
      red: Math.round(12 + 38 * glow),
      green: Math.round(28 + 165 * glow),
      blue: Math.round(44 + 211 * glow),
      alpha: Math.round(24 + 231 * intensity),
    }
  },
}

function clamp(value: number): number {
  return Math.min(Math.max(value, 0), 1)
}
