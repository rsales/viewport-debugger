import { getBreakpoint } from '../shared/breakpoints'
import type { ViewportInfo } from '../shared/types'
import styles from './styles.css?inline'

const HOST_ID = 'viewport-debugger-host'

export interface ViewportOverlay {
  setVisible(visible: boolean): void
  update(): void
}

export function createOverlay(): ViewportOverlay {
  const existing = document.getElementById(HOST_ID)

  if (existing) {
    existing.remove()
  }

  const host = document.createElement('div')
  host.id = HOST_ID
  const shadowRoot = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = styles

  const container = document.createElement('div')
  container.className = 'viewport-debugger'
  container.setAttribute('role', 'status')
  container.setAttribute('aria-live', 'polite')

  const label = document.createElement('span')
  label.className = 'viewport-debugger__label'
  label.textContent = 'Viewport'

  const size = document.createElement('strong')
  size.className = 'viewport-debugger__size'

  const meta = document.createElement('span')
  meta.className = 'viewport-debugger__meta'

  container.append(label, size, meta)
  shadowRoot.append(style, container)
  document.documentElement.appendChild(host)

  function getViewportInfo(): ViewportInfo {
    const width = Math.max(0, Math.round(window.innerWidth))
    const height = Math.max(0, Math.round(window.innerHeight))
    const devicePixelRatio = Math.max(1, window.devicePixelRatio || 1)

    return {
      width,
      height,
      devicePixelRatio,
      breakpoint: getBreakpoint(width),
    }
  }

  function update() {
    const info = getViewportInfo()

    size.textContent = `${info.width} × ${info.height} px`
    meta.textContent = `${info.breakpoint} · DPR ${info.devicePixelRatio}`
  }

  function setVisible(visible: boolean) {
    host.hidden = !visible
  }

  window.addEventListener('resize', update, { passive: true })
  window.visualViewport?.addEventListener('resize', update, { passive: true })

  update()

  return {
    setVisible,
    update,
  }
}
