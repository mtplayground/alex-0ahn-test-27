import type { VelocitySnapshot } from '../sim/FluidSimulation'

interface VelocityOverlayRendererOptions {
  color?: string
  lineWidth?: number
  sampleStep?: number
  minMagnitude?: number
  maxArrowLength?: number
}

interface ViewportLike {
  width: number
  height: number
}

const DEFAULT_COLOR = 'rgba(225, 241, 255, 0.82)'
const DEFAULT_LINE_WIDTH = 1.35
const DEFAULT_SAMPLE_STEP = 8
const DEFAULT_MIN_MAGNITUDE = 0.025
const DEFAULT_MAX_ARROW_LENGTH = 18

export class VelocityOverlayRenderer {
  private readonly color: string
  private readonly lineWidth: number
  private readonly sampleStep: number
  private readonly minMagnitude: number
  private readonly maxArrowLength: number

  constructor({
    color = DEFAULT_COLOR,
    lineWidth = DEFAULT_LINE_WIDTH,
    sampleStep = DEFAULT_SAMPLE_STEP,
    minMagnitude = DEFAULT_MIN_MAGNITUDE,
    maxArrowLength = DEFAULT_MAX_ARROW_LENGTH,
  }: VelocityOverlayRendererOptions = {}) {
    this.color = color
    this.lineWidth = lineWidth
    this.sampleStep = sampleStep
    this.minMagnitude = minMagnitude
    this.maxArrowLength = maxArrowLength
  }

  render(
    context: CanvasRenderingContext2D,
    velocity: VelocitySnapshot,
    viewport: ViewportLike,
  ): void {
    const size = velocity.x.size
    const cellWidth = viewport.width / size
    const cellHeight = viewport.height / size
    const arrowScale = Math.min(cellWidth, cellHeight) * 1.6

    context.save()
    context.strokeStyle = this.color
    context.lineWidth = this.lineWidth
    context.lineCap = 'round'
    context.lineJoin = 'round'

    for (let j = 1; j <= size; j += this.sampleStep) {
      for (let i = 1; i <= size; i += this.sampleStep) {
        const vx = velocity.x.get(i, j)
        const vy = velocity.y.get(i, j)
        const magnitude = Math.hypot(vx, vy)

        if (magnitude < this.minMagnitude) {
          continue
        }

        const startX = ((i - 0.5) / size) * viewport.width
        const startY = ((j - 0.5) / size) * viewport.height
        const directionX = vx / magnitude
        const directionY = vy / magnitude
        const shaftLength = Math.min(
          this.maxArrowLength,
          magnitude * arrowScale,
        )
        const endX = startX + directionX * shaftLength
        const endY = startY + directionY * shaftLength

        drawArrow(context, startX, startY, endX, endY)
      }
    }

    context.restore()
  }
}

function drawArrow(
  context: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): void {
  const angle = Math.atan2(endY - startY, endX - startX)
  const headLength = 4.5
  const leftAngle = angle - Math.PI / 7
  const rightAngle = angle + Math.PI / 7

  context.beginPath()
  context.moveTo(startX, startY)
  context.lineTo(endX, endY)
  context.moveTo(endX, endY)
  context.lineTo(
    endX - Math.cos(leftAngle) * headLength,
    endY - Math.sin(leftAngle) * headLength,
  )
  context.moveTo(endX, endY)
  context.lineTo(
    endX - Math.cos(rightAngle) * headLength,
    endY - Math.sin(rightAngle) * headLength,
  )
  context.stroke()
}
