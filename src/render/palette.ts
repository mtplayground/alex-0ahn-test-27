export interface RGBAColor {
  red: number
  green: number
  blue: number
  alpha: number
}

export interface RenderTheme {
  mapDensity(value: number): RGBAColor
}

export type ThemeId = 'water-blue' | 'amber-heat'

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

export const amberHeatTheme: RenderTheme = {
  mapDensity(value) {
    const intensity = clamp(value)
    const glow = Math.pow(intensity, 0.74)

    return {
      red: Math.round(22 + 233 * glow),
      green: Math.round(12 + 122 * glow),
      blue: Math.round(6 + 44 * intensity),
      alpha: Math.round(24 + 231 * intensity),
    }
  },
}

export const renderThemes: Record<ThemeId, RenderTheme> = {
  'water-blue': waterBlueTheme,
  'amber-heat': amberHeatTheme,
}

export function getRenderTheme(themeId: ThemeId): RenderTheme {
  return renderThemes[themeId]
}

function clamp(value: number): number {
  return Math.min(Math.max(value, 0), 1)
}
