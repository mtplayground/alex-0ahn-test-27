import { Grid } from './Grid'
import { type BoundaryMode, BoundaryType } from './types'

export function setBoundary(
  boundaryType: BoundaryType,
  field: Grid,
  mode: BoundaryMode = 'reflect',
): void {
  if (mode === 'wrap') {
    setWrapBoundary(field)
    return
  }

  const size = field.size

  for (let i = 1; i <= size; i += 1) {
    field.set(
      0,
      i,
      boundaryType === BoundaryType.HorizontalVelocity
        ? -field.get(1, i)
        : field.get(1, i),
    )
    field.set(
      size + 1,
      i,
      boundaryType === BoundaryType.HorizontalVelocity
        ? -field.get(size, i)
        : field.get(size, i),
    )
    field.set(
      i,
      0,
      boundaryType === BoundaryType.VerticalVelocity
        ? -field.get(i, 1)
        : field.get(i, 1),
    )
    field.set(
      i,
      size + 1,
      boundaryType === BoundaryType.VerticalVelocity
        ? -field.get(i, size)
        : field.get(i, size),
    )
  }

  setCorners(field)
}

function setWrapBoundary(field: Grid): void {
  const size = field.size

  for (let i = 1; i <= size; i += 1) {
    field.set(0, i, field.get(size, i))
    field.set(size + 1, i, field.get(1, i))
    field.set(i, 0, field.get(i, size))
    field.set(i, size + 1, field.get(i, 1))
  }

  field.set(0, 0, field.get(size, size))
  field.set(0, size + 1, field.get(size, 1))
  field.set(size + 1, 0, field.get(1, size))
  field.set(size + 1, size + 1, field.get(1, 1))
}

function setCorners(field: Grid): void {
  const size = field.size

  field.set(0, 0, 0.5 * (field.get(1, 0) + field.get(0, 1)))
  field.set(0, size + 1, 0.5 * (field.get(1, size + 1) + field.get(0, size)))
  field.set(size + 1, 0, 0.5 * (field.get(size, 0) + field.get(size + 1, 1)))
  field.set(
    size + 1,
    size + 1,
    0.5 * (field.get(size, size + 1) + field.get(size + 1, size)),
  )
}
