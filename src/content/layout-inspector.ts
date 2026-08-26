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

function normalizeGap(value: string): string {
  return !value || value === 'normal' ? '0px' : value
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
      node.columnGap = normalizeGap(style.columnGap)
      node.rowGap = normalizeGap(style.rowGap)
    } else {
      node.direction = style.flexDirection
      node.wrap = style.flexWrap
      node.columnGap = normalizeGap(style.columnGap)
      node.rowGap = normalizeGap(style.rowGap)
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

  function createGridLayer(style: CSSStyleDeclaration, columns?: number, rows?: number): HTMLDivElement | null {
    if (!columns || columns < 1 || !style.gridTemplateColumns || style.gridTemplateColumns === 'none') return null

    const layer = document.createElement('div')
    layer.style.cssText = [
      'position:absolute',
      'inset:0',
      'display:grid',
      `grid-template-columns:${style.gridTemplateColumns}`,
      style.gridTemplateRows && style.gridTemplateRows !== 'none'
        ? `grid-template-rows:${style.gridTemplateRows}`
        : 'grid-template-rows:1fr',
      `column-gap:${style.columnGap}`,
      `row-gap:${style.rowGap}`,
      'pointer-events:none',
    ].join(';')

    const rowCount = rows && rows > 0 ? rows : 1
    const cellCount = columns * rowCount

    for (let index = 0; index < cellCount; index += 1) {
      const cell = document.createElement('div')
      cell.style.cssText = [
        'min-width:0',
        'min-height:0',
        'box-sizing:border-box',
        'background:rgba(0,179,176,.09)',
        'border:1px solid rgba(0,179,176,.30)',
      ].join(';')
      layer.appendChild(cell)
    }

    return layer
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
      'background:transparent',
      'overflow:hidden',
    ].join(';')

    if (node.kind === 'grid') {
      const style = getComputedStyle(node.element)
      const gridLayer = createGridLayer(style, node.columns, node.rows)
      if (gridLayer) marker.appendChild(gridLayer)
    } else {
      marker.style.background = 'rgba(0,179,176,.08)'
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
