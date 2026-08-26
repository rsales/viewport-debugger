import { getBreakpoint, getBreakpointState, DEFAULT_BREAKPOINTS } from '../shared/breakpoints'
import type { Breakpoint, SiteBreakpointConfig, ViewportInfo } from '../shared/types'
import styles from './styles.css?inline'

const HOST_ID = 'viewport-debugger-host'
const PANEL_PADDING = 14
const DRAG_THRESHOLD = 3
const POSITION_STORAGE_KEY = 'panelPosition'

interface PanelPosition {
  x: number
  y: number
}

export interface ViewportOverlay {
  setVisible(visible: boolean): void
  setBreakpoints(config: SiteBreakpointConfig): void
  update(): void
}

export function createOverlay(config: SiteBreakpointConfig = {
  source: 'default',
  breakpoints: DEFAULT_BREAKPOINTS,
}): ViewportOverlay {
  const existing = document.getElementById(HOST_ID)

  if (existing) existing.remove()

  const host = document.createElement('div')
  host.id = HOST_ID
  host.hidden = true
  host.style.display = 'none'

  const shadowRoot = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = styles

  const panel = document.createElement('section')
  panel.className = 'viewport-debugger'
  panel.setAttribute('aria-label', 'Viewport debugger')

  const title = document.createElement('button')
  title.type = 'button'
  title.className = 'viewport-debugger__title'
  title.setAttribute('aria-label', 'Move or collapse viewport debugger')
  title.setAttribute('aria-expanded', 'true')

  const titleText = document.createElement('span')
  titleText.textContent = 'viewport'

  const grip = document.createElement('span')
  grip.className = 'viewport-debugger__grip'
  grip.setAttribute('aria-hidden', 'true')
  grip.textContent = '⠿'

  title.append(titleText, grip)

  const content = document.createElement('div')
  content.className = 'viewport-debugger__content'

  const size = document.createElement('strong')
  size.className = 'viewport-debugger__size'

  const meta = document.createElement('span')
  meta.className = 'viewport-debugger__meta'

  content.append(size, meta)
  panel.append(title, content)
  shadowRoot.append(style, panel)
  document.documentElement.appendChild(host)

  let visible = false
  let positionReady = false
  let breakpointConfig = config

  function getViewportInfo(): ViewportInfo {
    const width = Math.max(0, Math.round(window.innerWidth))
    const height = Math.max(0, Math.round(window.innerHeight))
    const devicePixelRatio = Math.max(1, window.devicePixelRatio || 1)

    return {
      width,
      height,
      devicePixelRatio,
      breakpoint: getBreakpoint(width, breakpointConfig.breakpoints).name,
    }
  }

  function update() {
    const info = getViewportInfo()
    const state = getBreakpointState(info.width, breakpointConfig.breakpoints)

    size.textContent = `${info.width} × ${info.height} px`

    const next = state.next
      ? ` · ${state.distanceToNext}px → ${state.next.name}`
      : ''

    meta.textContent = `${info.breakpoint} · DPR ${info.devicePixelRatio}${next}`
  }

  function applyVisibility() {
    const shouldShow = visible && positionReady
    host.hidden = !shouldShow
    host.style.display = shouldShow ? 'block' : 'none'
  }

  function setVisible(nextVisible: boolean) {
    visible = nextVisible
    applyVisibility()
  }

  function setBreakpoints(nextConfig: SiteBreakpointConfig) {
    breakpointConfig = nextConfig
    update()
  }

  let fx = 1
  let fy = 0

  function getFreeSpace() {
    const rect = panel.getBoundingClientRect()

    return {
      width: Math.max(1, window.innerWidth - rect.width - PANEL_PADDING * 2),
      height: Math.max(1, window.innerHeight - rect.height - PANEL_PADDING * 2),
    }
  }

  function clampPosition(left: number, top: number) {
    const free = getFreeSpace()

    return {
      left: Math.min(PANEL_PADDING + free.width, Math.max(PANEL_PADDING, left)),
      top: Math.min(PANEL_PADDING + free.height, Math.max(PANEL_PADDING, top)),
    }
  }

  function storePosition(left: number, top: number) {
    const free = getFreeSpace()

    fx = Math.min(1, Math.max(0, (left - PANEL_PADDING) / free.width))
    fy = Math.min(1, Math.max(0, (top - PANEL_PADDING) / free.height))
  }

  function persistPosition() {
    chrome.storage.local.set({
      [POSITION_STORAGE_KEY]: { x: fx, y: fy } satisfies PanelPosition,
    })
  }

  function place() {
    const free = getFreeSpace()
    const position = clampPosition(
      PANEL_PADDING + fx * free.width,
      PANEL_PADDING + fy * free.height,
    )

    panel.style.left = `${position.left}px`
    panel.style.top = `${position.top}px`
    panel.style.right = 'auto'
    panel.style.bottom = 'auto'
  }

  function restorePosition() {
    chrome.storage.local.get(
      { [POSITION_STORAGE_KEY]: { x: 1, y: 0 } },
      (result) => {
        const position = result[POSITION_STORAGE_KEY] as PanelPosition | undefined

        if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) {
          fx = Math.min(1, Math.max(0, position.x))
          fy = Math.min(1, Math.max(0, position.y))
        }

        place()
        positionReady = true
        applyVisibility()
      },
    )
  }

  let active = false
  let moved = false
  let startX = 0
  let startY = 0
  let originLeft = 0
  let originTop = 0

  title.addEventListener('pointerdown', (event) => {
    const rect = panel.getBoundingClientRect()

    active = true
    moved = false
    startX = event.clientX
    startY = event.clientY
    originLeft = rect.left
    originTop = rect.top

    title.setPointerCapture(event.pointerId)
    panel.classList.add('dragging')
  })

  title.addEventListener('pointermove', (event) => {
    if (!active) return

    const dx = event.clientX - startX
    const dy = event.clientY - startY

    if (!moved && Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) moved = true
    if (!moved) return

    const position = clampPosition(originLeft + dx, originTop + dy)
    panel.style.left = `${position.left}px`
    panel.style.top = `${position.top}px`
    panel.style.right = 'auto'
    panel.style.bottom = 'auto'
    storePosition(position.left, position.top)
  })

  function release(event: PointerEvent) {
    if (!active) return

    active = false
    panel.classList.remove('dragging')

    if (title.hasPointerCapture(event.pointerId)) title.releasePointerCapture(event.pointerId)

    if (moved) {
      persistPosition()
      return
    }

    const collapsed = panel.classList.toggle('closed')
    title.setAttribute('aria-expanded', String(!collapsed))
  }

  title.addEventListener('pointerup', release)
  title.addEventListener('pointercancel', release)

  window.addEventListener('resize', () => {
    if (positionReady) place()
    update()
  }, { passive: true })

  window.visualViewport?.addEventListener('resize', update, { passive: true })

  update()
  restorePosition()

  return {
    setVisible,
    setBreakpoints,
    update,
  }
}
