export type LayoutKind = 'grid' | 'flex'

export interface LayoutNode {
  id: number
  kind: LayoutKind
  element: HTMLElement
  selector: string
  display: string
  columns?: number
  rows?: number
  columnGap?: string
  rowGap?: string
  direction?: string
  wrap?: string
}

const MAX_NODES = 100

function getElementLabel(element: HTMLElement): string {
  if (element.id) return `#${element.id}`
  const tag = element.tagName.toLowerCase()
  const classes = [...element.classList].filter(Boolean).slice(0, 2)
  return classes.length ? `${tag}.${classes.join('.')}` : tag
}

function countTracks(value: string): number | undefined {
  if (!value || value === 'none') return undefined
  const match = value.match(/(?:^|\s)(?:repeat\(\s*(\d+)\s*,|(?:minmax|fit-content)\()/)
  if (match?.[1]) return Number(match[1])
  const tokens = value.match(/(?:minmax\([^)]*\)|fit-content\([^)]*\)|\[[^\]]*\]|[^\s]+)/g)
  return tokens?.length || undefined
}

function getDirectSelector(element: HTMLElement): string {
  const parts: string[] = []
  let current: HTMLElement | null = element
  let depth = 0

  while (current && current !== document.body && depth < 3) {
    parts.unshift(getElementLabel(current))
    current = current.parentElement
    depth += 1
  }

  return parts.join(' > ')
}

export function scanLayoutNodes(): LayoutNode[] {
  const nodes: LayoutNode[] = []
  const elements = document.querySelectorAll<HTMLElement>('*')

  for (const element of elements) {
    if (nodes.length >= MAX_NODES) break
    if (element.id === 'viewport-debugger-host' || element.closest('#viewport-debugger-host')) continue

    const style = getComputedStyle(element)
    const display = style.display
    if (display !== 'grid' && display !== 'inline-grid' && display !== 'flex' && display !== 'inline-flex') continue

    const kind: LayoutKind = display.includes('grid') ? 'grid' : 'flex'
    const node: LayoutNode = {
      id: nodes.length + 1,
      kind,
      element,
      selector: getDirectSelector(element),
      display,
    }

    if (kind === 'grid') {
      node.columns = countTracks(style.gridTemplateColumns)
      node.rows = countTracks(style.gridTemplateRows)
      node.columnGap = style.columnGap
      node.rowGap = style.rowGap
    } else {
      node.direction = style.flexDirection
      node.wrap = style.flexWrap
      node.columnGap = style.columnGap
      node.rowGap = style.rowGap
    }

    nodes.push(node)
  }

  return nodes
}

export function createLayoutOverlay(): {
  highlight(node: LayoutNode | null): void
  clear(): void
} {
  const existing = document.getElementById('viewport-debugger-layout-overlay')
  existing?.remove()

  const root = document.createElement('div')
  root.id = 'viewport-debugger-layout-overlay'
  root.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:2147483646',
    'pointer-events:none',
  ].join(';')
  document.documentElement.appendChild(root)

  let active: HTMLElement | null = null
  let marker: HTMLDivElement | null = null

  function clear() {
    active = null
    marker?.remove()
    marker = null
  }

  function highlight(node: LayoutNode | null) {
    clear()
    if (!node) return

    active = node.element
    marker = document.createElement('div')
    marker.style.cssText = [
      'position:fixed',
      'pointer-events:none',
      'box-sizing:border-box',
      'border:1px solid rgba(0,179,176,.9)',
      'background:rgba(0,179,176,.10)',
    ].join(';')

    if (node.kind === 'grid') {
      marker.style.backgroundImage = 'repeating-linear-gradient(to right, rgba(0,179,176,.16) 0, rgba(0,179,176,.16) 1px, transparent 1px, transparent 8.3333%)'
    }

    root.appendChild(marker)
    update()
  }

  function update() {
    if (!active || !marker) return
    const rect = active.getBoundingClientRect()
    marker.style.left = `${rect.left}px`
    marker.style.top = `${rect.top}px`
    marker.style.width = `${rect.width}px`
    marker.style.height = `${rect.height}px`
  }

  window.addEventListener('resize', update, { passive: true })
  window.addEventListener('scroll', update, { passive: true, capture: true })

  return { highlight, clear }
}
