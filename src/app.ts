import { DEFAULT_POINTER_DENSITY_AMOUNT } from './config/defaults'
import {
  attachPointerController,
  type PointerController,
} from './input/pointerController'
import { type AnimationLoopController, createAnimationLoop } from './loop'
import { PerformanceMonitor } from './performance/PerformanceMonitor'
import { DensityRenderer } from './render/densityRenderer'
import { getRenderTheme, type ThemeId } from './render/palette'
import { VelocityOverlayRenderer } from './render/velocityOverlayRenderer'
import { type CanvasViewport, resizeCanvasToDisplaySize } from './resize'
import { Simulation } from './sim/FluidSimulation'
import { Grid } from './sim/Grid'

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
  averageFps: HTMLElement
  degradationNotice: HTMLElement
  velocityToggle: HTMLButtonElement
  brushStrengthSlider: HTMLInputElement
  brushStrengthValue: HTMLElement
  viscositySlider: HTMLInputElement
  viscosityValue: HTMLElement
  diffusionSlider: HTMLInputElement
  diffusionValue: HTMLElement
  decaySlider: HTMLInputElement
  decayValue: HTMLElement
  resolutionSelect: HTMLSelectElement
  resolutionValue: HTMLElement
  themeSelect: HTMLSelectElement
  pauseButton: HTMLButtonElement
  resetButton: HTMLButtonElement
}

interface RuntimeControls {
  brushStrength: number
  size: number
  viscosity: number
  diffusion: number
  decay: number
  themeId: ThemeId
}

const DEFAULT_CONTROLS: RuntimeControls = {
  brushStrength: DEFAULT_POINTER_DENSITY_AMOUNT,
  size: 96,
  viscosity: 0.00002,
  diffusion: 0.0001,
  decay: 0.992,
  themeId: 'water-blue',
}

const RESOLUTION_OPTIONS = [64, 96, 128] as const
const MIN_SIMULATION_SIZE = 32
const MAX_SIMULATION_SIZE = 160
const REFERENCE_VIEWPORT_EDGE = 900
const INITIAL_PULSE_HALF_WIDTH = 1
const INITIAL_PULSE_DENSITY = 36
const INITIAL_PULSE_VELOCITY_X = 1.25
const INITIAL_PULSE_VELOCITY_Y = -0.75
const INITIAL_PULSE_STEP_DT = 1 / 180
const INITIAL_PULSE_HOLD_MS = 64

class App implements AppController {
  private readonly context: CanvasRenderingContext2D
  private readonly loop: AnimationLoopController
  private readonly renderer: DensityRenderer
  private readonly velocityOverlayRenderer: VelocityOverlayRenderer
  private readonly performanceMonitor: PerformanceMonitor
  private simulation: Simulation
  private pointerController: PointerController
  private controls: RuntimeControls
  private paused = false
  private showVelocityOverlay = false
  private averageFps = 0
  private degradationNotice = ''
  private stepDelayRemainingMs = 0
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
    this.controls = { ...DEFAULT_CONTROLS }
    this.renderer = new DensityRenderer({
      theme: getRenderTheme(this.controls.themeId),
    })
    this.velocityOverlayRenderer = new VelocityOverlayRenderer()
    this.performanceMonitor = new PerformanceMonitor({
      sampleSize: 6,
      requiredLowSamples: 2,
    })
    this.simulation = this.createSimulation()
    this.pointerController = this.attachPointerController()
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
        this.trackPerformance(fps)
        this.step(deltaMs)
        this.draw()
        this.elements.fps.textContent = fps.toFixed(1)
        this.elements.averageFps.textContent = this.averageFps.toFixed(1)
      },
    })
  }

  start(): void {
    this.windowObject.addEventListener('resize', this.handleResize)
    this.bindControls()
    this.primeSimulation()
    this.syncControls()
    this.draw()
    this.loop.start()
  }

  destroy(): void {
    this.windowObject.removeEventListener('resize', this.handleResize)
    this.unbindControls()
    this.pointerController.destroy()
    this.loop.stop()
  }

  private createSimulation(): Simulation {
    return new Simulation({
      size: this.resolveSimulationSize(this.controls.size),
      diffusion: this.controls.diffusion,
      viscosity: this.controls.viscosity,
      decay: this.controls.decay,
      iterations: 20,
    })
  }

  private attachPointerController(): PointerController {
    return attachPointerController({
      canvas: this.elements.canvas,
      simulation: this.simulation,
      gridSize: this.simulation.getConfig().size,
      getDensityAmount: () => this.controls.brushStrength,
    })
  }

  private bindControls(): void {
    this.elements.velocityToggle.addEventListener(
      'click',
      this.handleToggleClick,
    )
    this.elements.brushStrengthSlider.addEventListener(
      'input',
      this.handleBrushStrengthInput,
    )
    this.elements.viscositySlider.addEventListener(
      'input',
      this.handleViscosityInput,
    )
    this.elements.diffusionSlider.addEventListener(
      'input',
      this.handleDiffusionInput,
    )
    this.elements.decaySlider.addEventListener('input', this.handleDecayInput)
    this.elements.resolutionSelect.addEventListener(
      'change',
      this.handleResolutionChange,
    )
    this.elements.themeSelect.addEventListener('change', this.handleThemeChange)
    this.elements.pauseButton.addEventListener('click', this.handlePauseClick)
    this.elements.resetButton.addEventListener('click', this.handleResetClick)
  }

  private unbindControls(): void {
    this.elements.velocityToggle.removeEventListener(
      'click',
      this.handleToggleClick,
    )
    this.elements.brushStrengthSlider.removeEventListener(
      'input',
      this.handleBrushStrengthInput,
    )
    this.elements.viscositySlider.removeEventListener(
      'input',
      this.handleViscosityInput,
    )
    this.elements.diffusionSlider.removeEventListener(
      'input',
      this.handleDiffusionInput,
    )
    this.elements.decaySlider.removeEventListener(
      'input',
      this.handleDecayInput,
    )
    this.elements.resolutionSelect.removeEventListener(
      'change',
      this.handleResolutionChange,
    )
    this.elements.themeSelect.removeEventListener(
      'change',
      this.handleThemeChange,
    )
    this.elements.pauseButton.removeEventListener(
      'click',
      this.handlePauseClick,
    )
    this.elements.resetButton.removeEventListener(
      'click',
      this.handleResetClick,
    )
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

    this.rebuildSimulation({ preserveState: true })
    this.syncControls()
    this.draw()
  }

  private readonly handleToggleClick = (): void => {
    this.showVelocityOverlay = !this.showVelocityOverlay
    this.syncControls()
    this.draw()
  }

  private readonly handleBrushStrengthInput = (): void => {
    this.controls.brushStrength = readSliderValue(
      this.elements.brushStrengthSlider,
    )
    this.clearDegradationNotice()
    this.syncControls()
  }

  private readonly handleViscosityInput = (): void => {
    const viscosity = readSliderValue(this.elements.viscositySlider)
    this.controls.viscosity = viscosity
    this.simulation.setViscosity(viscosity)
    this.clearDegradationNotice()
    this.syncControls()
  }

  private readonly handleDiffusionInput = (): void => {
    const diffusion = readSliderValue(this.elements.diffusionSlider)
    this.controls.diffusion = diffusion
    this.simulation.setDiffusion(diffusion)
    this.clearDegradationNotice()
    this.syncControls()
  }

  private readonly handleDecayInput = (): void => {
    const decay = readSliderValue(this.elements.decaySlider)
    this.controls.decay = decay
    this.simulation.setDecay(decay)
    this.clearDegradationNotice()
    this.syncControls()
  }

  private readonly handleResolutionChange = (): void => {
    const size = Number(this.elements.resolutionSelect.value)

    if (
      !RESOLUTION_OPTIONS.includes(size as (typeof RESOLUTION_OPTIONS)[number])
    ) {
      return
    }

    this.controls.size = size
    this.performanceMonitor.reset()
    this.clearDegradationNotice()
    this.rebuildSimulation({ preserveState: true })
    this.syncControls()
    this.draw()
  }

  private readonly handleThemeChange = (): void => {
    const themeId = this.elements.themeSelect.value as ThemeId

    if (!isThemeId(themeId)) {
      return
    }

    this.controls.themeId = themeId
    this.renderer.setTheme(getRenderTheme(themeId))
    this.clearDegradationNotice()
    this.syncControls()
    this.draw()
  }

  private readonly handlePauseClick = (): void => {
    this.paused = !this.paused
    this.performanceMonitor.reset()
    this.syncControls()
  }

  private readonly handleResetClick = (): void => {
    this.performanceMonitor.reset()
    this.clearDegradationNotice()
    this.rebuildSimulation({ preserveState: false })
    this.primeSimulation()
    this.syncControls()
    this.draw()
  }

  private rebuildSimulation({
    preserveState,
  }: {
    preserveState: boolean
  }): void {
    const densitySnapshot = preserveState ? this.simulation.getDensity() : null
    const velocitySnapshot = preserveState
      ? this.simulation.getVelocity()
      : null
    const nextSimulation = this.createSimulation()

    this.pointerController.destroy()

    if (densitySnapshot && velocitySnapshot) {
      nextSimulation.restoreState(
        resampleGrid(densitySnapshot, nextSimulation.getConfig().size),
        {
          x: resampleGrid(velocitySnapshot.x, nextSimulation.getConfig().size),
          y: resampleGrid(velocitySnapshot.y, nextSimulation.getConfig().size),
        },
      )
    }

    this.simulation = nextSimulation
    this.pointerController = this.attachPointerController()
  }

  private step(deltaMs: number): void {
    if (this.paused) {
      return
    }

    if (this.stepDelayRemainingMs > 0) {
      this.stepDelayRemainingMs = Math.max(
        0,
        this.stepDelayRemainingMs - deltaMs,
      )
      return
    }

    const dt = Math.min(deltaMs / 1000, 1 / 30)
    this.simulation.step(dt)
  }

  private trackPerformance(fps: number): void {
    const snapshot = this.performanceMonitor.recordFrame(fps)
    this.averageFps = snapshot.averageFps

    if (!this.paused && snapshot.shouldDowngrade) {
      this.autoDowngradeResolution()
    }
  }

  private autoDowngradeResolution(): void {
    const currentIndex = RESOLUTION_OPTIONS.indexOf(
      this.controls.size as (typeof RESOLUTION_OPTIONS)[number],
    )

    if (currentIndex <= 0) {
      this.performanceMonitor.reset()
      return
    }

    const nextSize = RESOLUTION_OPTIONS[currentIndex - 1]

    if (nextSize === undefined) {
      this.performanceMonitor.reset()
      return
    }

    const previousRequestedSize = this.controls.size
    this.controls.size = nextSize
    this.performanceMonitor.reset()
    this.degradationNotice = `Performance fallback: ${previousRequestedSize.toString()} → ${nextSize.toString()}`
    this.rebuildSimulation({ preserveState: true })
    this.syncControls()
    this.draw()
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

  private primeSimulation(): void {
    seedInitialPulse(this.simulation)
    this.simulation.step(INITIAL_PULSE_STEP_DT)
    this.stepDelayRemainingMs = INITIAL_PULSE_HOLD_MS
  }

  private syncControls(): void {
    this.elements.velocityToggle.setAttribute(
      'aria-pressed',
      this.showVelocityOverlay ? 'true' : 'false',
    )
    this.elements.velocityToggle.textContent = this.showVelocityOverlay
      ? 'Hide velocity vectors'
      : 'Show velocity vectors'
    this.elements.brushStrengthSlider.value =
      this.controls.brushStrength.toString()
    this.elements.brushStrengthValue.textContent =
      this.controls.brushStrength.toFixed(0)
    this.elements.viscositySlider.value = this.controls.viscosity.toString()
    this.elements.viscosityValue.textContent = formatScientific(
      this.controls.viscosity,
    )
    this.elements.diffusionSlider.value = this.controls.diffusion.toString()
    this.elements.diffusionValue.textContent = formatScientific(
      this.controls.diffusion,
    )
    this.elements.decaySlider.value = this.controls.decay.toString()
    this.elements.decayValue.textContent = this.controls.decay.toFixed(3)
    this.elements.resolutionSelect.value = this.controls.size.toString()
    this.elements.resolutionValue.textContent = formatGridSize(
      this.simulation.getConfig().size,
    )
    this.elements.themeSelect.value = this.controls.themeId
    this.elements.pauseButton.setAttribute(
      'aria-pressed',
      this.paused ? 'true' : 'false',
    )
    this.elements.pauseButton.textContent = this.paused
      ? 'Resume simulation'
      : 'Pause simulation'
    this.elements.degradationNotice.textContent = this.degradationNotice
    this.elements.degradationNotice.hidden = this.degradationNotice.length === 0
  }

  private resolveSimulationSize(requestedSize: number): number {
    const viewportEdge = Math.max(
      1,
      Math.min(this.windowObject.innerWidth, this.windowObject.innerHeight),
    )
    const viewportScale = viewportEdge / REFERENCE_VIEWPORT_EDGE

    return clampInteger(
      Math.round(requestedSize * viewportScale),
      MIN_SIMULATION_SIZE,
      MAX_SIMULATION_SIZE,
    )
  }

  private clearDegradationNotice(): void {
    this.degradationNotice = ''
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
        <p class="copy">Drag across the canvas to inject velocity, press to seed density, and shape the flow with a floating control panel.</p>
        <div class="metrics">
          <span class="metric-label">FPS</span>
          <span class="metric-value" data-testid="fps-counter">0.0</span>
        </div>
        <div class="metrics secondary-metric">
          <span class="metric-label">AVG</span>
          <span class="metric-value" data-testid="average-fps">0.0</span>
        </div>
        <p
          class="degradation-notice"
          data-testid="degradation-notice"
          hidden
        ></p>
      </section>
      <section class="control-panel" data-testid="control-panel">
        <div class="panel-header">
          <p class="panel-kicker">Simulation Controls</p>
          <button
            class="toggle-button control-inline-button"
            data-testid="velocity-overlay-toggle"
            type="button"
            aria-pressed="false"
          >
            Show velocity vectors
          </button>
        </div>
        <label class="control-field">
          <span class="control-topline">
            <span>Brush strength</span>
            <output data-testid="brush-strength-value">0</output>
          </span>
          <input
            data-testid="brush-strength-slider"
            type="range"
            min="24"
            max="120"
            step="1"
            value="${DEFAULT_CONTROLS.brushStrength.toString()}"
          />
        </label>
        <label class="control-field">
          <span class="control-topline">
            <span>Viscosity</span>
            <output data-testid="viscosity-value">0</output>
          </span>
          <input
            data-testid="viscosity-slider"
            type="range"
            min="0"
            max="0.001"
            step="0.00001"
            value="${DEFAULT_CONTROLS.viscosity.toString()}"
          />
        </label>
        <label class="control-field">
          <span class="control-topline">
            <span>Diffusion</span>
            <output data-testid="diffusion-value">0</output>
          </span>
          <input
            data-testid="diffusion-slider"
            type="range"
            min="0"
            max="0.0015"
            step="0.00001"
            value="${DEFAULT_CONTROLS.diffusion.toString()}"
          />
        </label>
        <label class="control-field">
          <span class="control-topline">
            <span>Decay</span>
            <output data-testid="decay-value">0</output>
          </span>
          <input
            data-testid="decay-slider"
            type="range"
            min="0.94"
            max="1"
            step="0.001"
            value="${DEFAULT_CONTROLS.decay.toString()}"
          />
        </label>
        <div class="control-grid">
          <label class="control-field">
            <span class="control-topline">
              <span>Resolution</span>
              <output data-testid="resolution-value">0 × 0</output>
            </span>
            <select data-testid="resolution-select">
              ${RESOLUTION_OPTIONS.map(
                (size) =>
                  `<option value="${size.toString()}">${size.toString()} × ${size.toString()}</option>`,
              ).join('')}
            </select>
          </label>
          <label class="control-field">
            <span class="control-topline">
              <span>Theme</span>
            </span>
            <select data-testid="theme-select">
              <option value="water-blue">Water Blue</option>
              <option value="amber-heat">Amber Heat</option>
            </select>
          </label>
        </div>
        <div class="panel-actions">
          <button
            class="toggle-button control-inline-button"
            data-testid="pause-button"
            type="button"
            aria-pressed="false"
          >
            Pause simulation
          </button>
          <button
            class="toggle-button control-inline-button secondary-button"
            data-testid="reset-button"
            type="button"
          >
            Reset fluid
          </button>
        </div>
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
    averageFps: getElement(root, '[data-testid="average-fps"]', HTMLElement),
    degradationNotice: getElement(
      root,
      '[data-testid="degradation-notice"]',
      HTMLElement,
    ),
    velocityToggle: getElement(
      root,
      '[data-testid="velocity-overlay-toggle"]',
      HTMLButtonElement,
    ),
    brushStrengthSlider: getElement(
      root,
      '[data-testid="brush-strength-slider"]',
      HTMLInputElement,
    ),
    brushStrengthValue: getElement(
      root,
      '[data-testid="brush-strength-value"]',
      HTMLElement,
    ),
    viscositySlider: getElement(
      root,
      '[data-testid="viscosity-slider"]',
      HTMLInputElement,
    ),
    viscosityValue: getElement(
      root,
      '[data-testid="viscosity-value"]',
      HTMLElement,
    ),
    diffusionSlider: getElement(
      root,
      '[data-testid="diffusion-slider"]',
      HTMLInputElement,
    ),
    diffusionValue: getElement(
      root,
      '[data-testid="diffusion-value"]',
      HTMLElement,
    ),
    decaySlider: getElement(
      root,
      '[data-testid="decay-slider"]',
      HTMLInputElement,
    ),
    decayValue: getElement(root, '[data-testid="decay-value"]', HTMLElement),
    resolutionSelect: getElement(
      root,
      '[data-testid="resolution-select"]',
      HTMLSelectElement,
    ),
    resolutionValue: getElement(
      root,
      '[data-testid="resolution-value"]',
      HTMLElement,
    ),
    themeSelect: getElement(
      root,
      '[data-testid="theme-select"]',
      HTMLSelectElement,
    ),
    pauseButton: getElement(
      root,
      '[data-testid="pause-button"]',
      HTMLButtonElement,
    ),
    resetButton: getElement(
      root,
      '[data-testid="reset-button"]',
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

function readSliderValue(input: HTMLInputElement): number {
  const value = Number(input.value)

  if (!Number.isFinite(value)) {
    throw new Error(
      `Expected slider "${input.dataset.testid ?? input.name}" to contain a finite number.`,
    )
  }

  return value
}

function isThemeId(themeId: string): themeId is ThemeId {
  return themeId === 'water-blue' || themeId === 'amber-heat'
}

function formatScientific(value: number): string {
  return value.toExponential(2)
}

function formatGridSize(size: number): string {
  return `${size.toString()} × ${size.toString()}`
}

function resampleGrid(source: Grid, targetSize: number): Grid {
  const target = new Grid(targetSize)

  for (let j = 1; j <= targetSize; j += 1) {
    const sampleY = ((j - 0.5) / targetSize) * source.size + 0.5

    for (let i = 1; i <= targetSize; i += 1) {
      const sampleX = ((i - 0.5) / targetSize) * source.size + 0.5
      target.set(i, j, bilinearSample(source, sampleX, sampleY))
    }
  }

  return target
}

function bilinearSample(grid: Grid, x: number, y: number): number {
  const x0 = clampInteger(Math.floor(x), 0, grid.size + 1)
  const x1 = clampInteger(x0 + 1, 0, grid.size + 1)
  const y0 = clampInteger(Math.floor(y), 0, grid.size + 1)
  const y1 = clampInteger(y0 + 1, 0, grid.size + 1)
  const sx = x - x0
  const sy = y - y0
  const top = lerp(grid.get(x0, y0), grid.get(x1, y0), sx)
  const bottom = lerp(grid.get(x0, y1), grid.get(x1, y1), sx)

  return lerp(top, bottom, sy)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function seedInitialPulse(simulation: Simulation): void {
  const size = simulation.getConfig().size
  const center = Math.max(1, Math.round(size / 2))

  for (
    let y = center - INITIAL_PULSE_HALF_WIDTH;
    y <= center + INITIAL_PULSE_HALF_WIDTH;
    y += 1
  ) {
    for (
      let x = center - INITIAL_PULSE_HALF_WIDTH;
      x <= center + INITIAL_PULSE_HALF_WIDTH;
      x += 1
    ) {
      simulation.addDensity(x, y, INITIAL_PULSE_DENSITY)
      simulation.addVelocity(
        x,
        y,
        INITIAL_PULSE_VELOCITY_X,
        INITIAL_PULSE_VELOCITY_Y,
      )
    }
  }
}
