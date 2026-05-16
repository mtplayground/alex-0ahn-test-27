import {
  attachPointerController,
  type PointerController,
} from './input/pointerController'
import { type AnimationLoopController, createAnimationLoop } from './loop'
import { DensityRenderer } from './render/densityRenderer'
import { VelocityOverlayRenderer } from './render/velocityOverlayRenderer'
import { type CanvasViewport, resizeCanvasToDisplaySize } from './resize'
import { Simulation } from './sim/FluidSimulation'

interface AppWindow {
  addEventListener: Window['addEventListener']
  removeEventListener: Window['removeEventListener']
  innerWidth: number
  innerHeight: number
  devicePixelRatio: number
  requestAnimationFrame: Window['requestAnimationFrame']
  cancelAnimationFrame: Window['cancelAnimationFrame']
}

interface MountAppOptions {
  root: HTMLElement
  title: string
  windowObject?: AppWindow
}

export interface AppController {
  destroy(): void
}

interface AppElements {
  canvas: HTMLCanvasElement
  title: HTMLElement
  fps: HTMLElement
  velocityToggle: HTMLButtonElement
}

class App implements AppController {
  private readonly context: CanvasRenderingContext2D
  private readonly loop: AnimationLoopController
  private readonly pointerController: PointerController
  private readonly renderer: DensityRenderer
  private readonly velocityOverlayRenderer: VelocityOverlayRenderer
  private readonly simulation: Simulation
  private readonly simulationSize: number
  private showVelocityOverlay = false
  private viewport: CanvasViewport

  constructor(
    private readonly elements: AppElements,
    private readonly windowObject: AppWindow,
  ) {
    const context = this.elements.canvas.getContext('2d')

    if (!context) {
      throw new Error('Canvas 2D context could not be created.')
    }

    this.context = context
    this.renderer = new DensityRenderer()
    this.velocityOverlayRenderer = new VelocityOverlayRenderer()
    this.simulationSize = 96
    this.simulation = new Simulation({
      size: this.simulationSize,
      diffusion: 0.0001,
      viscosity: 0.00002,
      iterations: 20,
    })
    this.pointerController = attachPointerController({
      canvas: this.elements.canvas,
      simulation: this.simulation,
      gridSize: this.simulationSize,
    })
    this.viewport = resizeCanvasToDisplaySize(
      this.elements.canvas,
      this.context,
      {
        width: this.windowObject.innerWidth,
        height: this.windowObject.innerHeight,
        devicePixelRatio: this.windowObject.devicePixelRatio,
      },
    )

    this.loop = createAnimationLoop({
      requestAnimationFrame: this.windowObject.requestAnimationFrame.bind(
        this.windowObject,
      ),
      cancelAnimationFrame: this.windowObject.cancelAnimationFrame.bind(
        this.windowObject,
      ),
      onFrame: ({ deltaMs, fps }) => {
        this.step(deltaMs)
        this.draw()
        this.elements.fps.textContent = fps.toFixed(1)
      },
    })
  }

  start(): void {
    this.windowObject.addEventListener('resize', this.handleResize)
    this.elements.velocityToggle.addEventListener(
      'click',
      this.handleToggleClick,
    )
    this.syncVelocityToggle()
    this.draw()
    this.loop.start()
  }

  destroy(): void {
    this.windowObject.removeEventListener('resize', this.handleResize)
    this.elements.velocityToggle.removeEventListener(
      'click',
      this.handleToggleClick,
    )
    this.pointerController.destroy()
    this.loop.stop()
  }

  private readonly handleResize = (): void => {
    this.viewport = resizeCanvasToDisplaySize(
      this.elements.canvas,
      this.context,
      {
        width: this.windowObject.innerWidth,
        height: this.windowObject.innerHeight,
        devicePixelRatio: this.windowObject.devicePixelRatio,
      },
    )

    this.draw()
  }

  private readonly handleToggleClick = (): void => {
    this.showVelocityOverlay = !this.showVelocityOverlay
    this.syncVelocityToggle()
    this.draw()
  }

  private step(deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 1 / 30)
    this.simulation.step(dt)
  }

  private draw(): void {
    this.context.clearRect(0, 0, this.viewport.width, this.viewport.height)
    this.renderer.render(this.context, this.simulation.getDensity())

    if (this.showVelocityOverlay) {
      this.velocityOverlayRenderer.render(
        this.context,
        this.simulation.getVelocity(),
        this.viewport,
      )
    }
  }

  private syncVelocityToggle(): void {
    this.elements.velocityToggle.setAttribute(
      'aria-pressed',
      this.showVelocityOverlay ? 'true' : 'false',
    )
    this.elements.velocityToggle.textContent = this.showVelocityOverlay
      ? 'Hide velocity vectors'
      : 'Show velocity vectors'
  }
}

export function renderApp(root: HTMLElement, title: string): void {
  root.innerHTML = `
    <main class="shell">
      <canvas
        class="canvas"
        id="fluid-canvas"
        data-testid="fluid-canvas"
        aria-label="Fluid simulation canvas"
      ></canvas>
      <section class="hud" data-testid="app-hud">
        <p class="eyebrow">Interactive Density Renderer</p>
        <h1 data-testid="app-title">${title}</h1>
        <p class="copy">Drag across the canvas to inject velocity, press to seed density, and optionally overlay sparse flow vectors for debugging.</p>
        <div class="metrics">
          <span class="metric-label">FPS</span>
          <span class="metric-value" data-testid="fps-counter">0.0</span>
        </div>
        <button
          class="toggle-button"
          data-testid="velocity-overlay-toggle"
          type="button"
          aria-pressed="false"
        >
          Show velocity vectors
        </button>
      </section>
    </main>
  `
}

export function mountApp({
  root,
  title,
  windowObject = window,
}: MountAppOptions): AppController {
  renderApp(root, title)

  const elements = queryElements(root)
  elements.title.textContent = title

  const app = new App(elements, windowObject)
  app.start()

  return app
}

function queryElements(root: HTMLElement): AppElements {
  return {
    canvas: getElement(root, '[data-testid="fluid-canvas"]', HTMLCanvasElement),
    title: getElement(root, '[data-testid="app-title"]', HTMLElement),
    fps: getElement(root, '[data-testid="fps-counter"]', HTMLElement),
    velocityToggle: getElement(
      root,
      '[data-testid="velocity-overlay-toggle"]',
      HTMLButtonElement,
    ),
  }
}

function getElement<T extends Element>(
  root: ParentNode,
  selector: string,
  type: { new (): T },
): T {
  const element = root.querySelector(selector)

  if (!(element instanceof type)) {
    throw new Error(
      `Expected element "${selector}" to be present in the app shell.`,
    )
  }

  return element
}
