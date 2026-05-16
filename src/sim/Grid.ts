export class Grid {
  readonly size: number
  readonly stride: number
  readonly data: Float32Array

  constructor(size: number, data?: Float32Array) {
    if (!Number.isInteger(size) || size <= 0) {
      throw new Error('Grid size must be a positive integer.')
    }

    this.size = size
    this.stride = size + 2

    if (data && data.length !== this.stride * this.stride) {
      throw new Error(
        `Grid data length must be ${(this.stride * this.stride).toString()} for size ${size.toString()}.`,
      )
    }

    this.data = data ?? new Float32Array(this.stride * this.stride)
  }

  index(i: number, j: number): number {
    if (!Number.isInteger(i) || !Number.isInteger(j)) {
      throw new Error('Grid indices must be integers.')
    }

    if (i < 0 || i >= this.stride || j < 0 || j >= this.stride) {
      throw new Error(
        `Grid index (${i.toString()}, ${j.toString()}) is outside 0..${(this.stride - 1).toString()}.`,
      )
    }

    return i + this.stride * j
  }

  get(i: number, j: number): number {
    return this.data[this.index(i, j)] ?? 0
  }

  set(i: number, j: number, value: number): void {
    this.data[this.index(i, j)] = value
  }

  fill(value: number): this {
    this.data.fill(value)
    return this
  }

  clone(): Grid {
    return new Grid(this.size, this.data.slice())
  }

  copyFrom(source: Grid): this {
    this.assertSameShape(source)
    this.data.set(source.data)
    return this
  }

  swapData(other: Grid): void {
    this.assertSameShape(other)
    const snapshot = this.data.slice()
    this.data.set(other.data)
    other.data.set(snapshot)
  }

  assertSameShape(other: Grid): void {
    if (this.size !== other.size) {
      throw new Error(
        `Grid size mismatch: expected ${this.size.toString()}, received ${other.size.toString()}.`,
      )
    }
  }
}
