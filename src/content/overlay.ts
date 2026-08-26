import { getBreakpoint, getBreakpointState, DEFAULT_BREAKPOINTS } from '../shared/breakpoints'
import type { SiteBreakpointConfig, ViewportInfo } from '../shared/types'
import styles from './styles.css?inline'

const HOST_ID = 'viewport-debugger-host'
const PANEL_PADDING = 14
const DRAG_THRESHOLD = 3
const POSITION_STORAGE_KEY = 'panelPosition'

interface PanelPosition { x: number; y: number }

export interface ViewportOverlay {
  setVisible(visible: boolean): void
  setBreakpoints(config: SiteBreakpointConfig): void
  update(): void
}

export function createOverlay(config: SiteBreakpointConfig = { source: 'default', breakpoints: DEFAULT_BREAKPOINTS }): ViewportOverlay {
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

  const infoRow = document.createElement('div')
  infoRow.className = 'viewport-debugger__info'

  const size = document.createElement('strong')
  size.className = 'viewport-debugger__size'

  const breakpointButton = document.createElement('button')
  breakpointButton.type = 'button'
  breakpointButton.className = 'viewport-debugger__breakpoint-trigger'
  breakpointButton.setAttribute('aria-expanded', 'false')
  breakpointButton.setAttribute('aria-label', 'Show breakpoints')

  const breakpointName = document.createElement('span')
  breakpointName.className = 'viewport-debugger__breakpoint-name'

  const breakpointWarning = document.createElement('span')
  breakpointWarning.className = 'viewport-debugger__breakpoint-warning'
  breakpointWarning.textContent = '!'
  breakpointWarning.setAttribute('aria-hidden', 'true')
  breakpointWarning.title = 'Default breakpoints: no breakpoints were detected in this site'

  const breakpointChevron = document.createElement('span')
  breakpointChevron.className = 'viewport-debugger__breakpoint-chevron'
  breakpointChevron.textContent = '⌄'
  breakpointChevron.setAttribute('aria-hidden', 'true')

  breakpointButton.append(breakpointName, breakpointWarning, breakpointChevron)

  const meta = document.createElement('span')
  meta.className = 'viewport-debugger__meta'

  const breakpointList = document.createElement('div')
  breakpointList.className = 'viewport-debugger__breakpoints'
  breakpointList.hidden = true
  breakpointList.setAttribute('aria-label', 'Breakpoints')

  const breakpointNotice = document.createElement('div')
  breakpointNotice.className = 'viewport-debugger__breakpoint-notice'
  const noticeIcon = document.createElement('span')
  noticeIcon.className = 'viewport-debugger__breakpoint-notice-icon'
  noticeIcon.textContent = '!'
  noticeIcon.setAttribute('aria-hidden', 'true')
  const noticeText = document.createElement('span')
  noticeText.textContent = 'Default breakpoints — no breakpoints were detected in this site.'
  breakpointNotice.append(noticeIcon, noticeText)

  infoRow.append(size, breakpointButton, meta)
  content.append(infoRow, breakpointList)
  panel.append(title, content)
  shadowRoot.append(style, panel)
  document.documentElement.appendChild(host)

  let visible = false
  let positionReady = false
  let breakpointConfig = config
  let breakpointsOpen = false

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

  function renderBreakpointList(activeName: string) {
    breakpointList.replaceChildren()

    if (breakpointConfig.source === 'default') {
      breakpointList.appendChild(breakpointNotice)
    }

    const sorted = [...breakpointConfig.breakpoints].sort((a, b) => a.minWidth - b.minWidth)
    for (const breakpoint of sorted) {
      const item = document.createElement('div')
      item.className = 'viewport-debugger__breakpoint-item'
      if (breakpoint.name === activeName) item.classList.add('is-active')

      const name = document.createElement('span')
      name.textContent = breakpoint.name
      const width = document.createElement('strong')
      width.textContent = `${breakpoint.minWidth}px`

      item.append(name, width)
      breakpointList.appendChild(item)
    }
  }

  function setBreakpointsOpen(open: boolean) {
    breakpointsOpen = open
    breakpointList.hidden = !open
    breakpointButton.setAttribute('aria-expanded', String(open))
    breakpointButton.classList.toggle('is-open', open)
    if (positionReady) place()
  }

  function update() {
    const info = getViewportInfo()
    const state = getBreakpointState(info.width, breakpointConfig.breakpoints)
    const usingDefaults = breakpointConfig.source === 'default'

    size.textContent = `${info.width} × ${info.height} px`
    breakpointName.textContent = info.breakpoint
    breakpointWarning.hidden = !usingDefaults
    breakpointWarning.title = usingDefaults
      ? 'Default breakpoints: no breakpoints were detected in this site'
      : ''
    breakpointButton.setAttribute(
      'aria-label',
      usingDefaults ? 'Show default breakpoints' : 'Show breakpoints',
    )

    const next = state.next ? ` · ${state.distanceToNext}px → ${state.next.name}` : ''
    meta.textContent = ` · DPR ${info.devicePixelRatio}${next}`
    renderBreakpointList(info.breakpoint)
  }

  breakpointButton.addEventListener('click', (event) => {
    event.stopPropagation()
    setBreakpointsOpen(!breakpointsOpen)
  })

  function applyVisibility() {
    const shouldShow = visible && positionReady
    host.hidden = !shouldShow
    host.style.display = shouldShow ? 'block' : 'none'
    host.style.visibility = shouldShow ? 'visible' : 'hidden'
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
    const position: PanelPosition = { x: fx, y: fy }
    chrome.storage.local.set({ [POSITION_STORAGE_KEY]: position })
  }

  function place() {
    const free = getFreeSpace()
    const position = clampPosition(PANEL_PADDING + fx * free.width, PANEL_PADDING + fy * free.height)
    panel.style.left = `${position.left}px`
    panel.style.top = `${position.top}px`
    panel.style.right = 'auto'
    panel.style.bottom = 'auto'
  }

  function restorePosition() {
    chrome.storage.local.get({ [POSITION_STORAGE_KEY]: { x: 1, y: 0 } }, (result) => {
      const position = result[POSITION_STORAGE_KEY] as PanelPosition | undefined
      if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) {
        fx = Math.min(1, Math.max(0, position.x))
        fy = Math.min(1, Math.max(0, position.y))
      }

      host.hidden = false
      host.style.display = 'block'
      host.style.visibility = 'hidden'

      place()
      positionReady = true
      applyVisibility()
    })
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

  return { setVisible, setBreakpoints, update }
}
