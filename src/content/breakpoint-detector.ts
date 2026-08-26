import type { Breakpoint } from '../shared/types'

interface DetectionResult {
  breakpoints: Breakpoint[]
  source: 'css-variable' | 'none'
}

const NAME_PATTERN = /^(?:--)(?:breakpoint|breakpoints)[-_]?([a-z0-9_-]+)$/i
const VALUE_PATTERN = /^(-?\d*\.?\d+)(px|rem|em)$/i

function toPixels(value: string): number | null {
  const match = value.trim().match(VALUE_PATTERN)
  if (!match) return null

  const number = Number(match[1])
  if (!Number.isFinite(number)) return null

  const unit = match[2].toLowerCase()
  if (unit === 'px') return number

  const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
  return Number.isFinite(rootFontSize) ? number * rootFontSize : null
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[_\s]+/g, '-')
}

export function detectBreakpoints(): DetectionResult {
  const found = new Map<number, Breakpoint>()
  const root = getComputedStyle(document.documentElement)

  for (let index = 0; index < root.length; index += 1) {
    const property = root.item(index)
    const match = property.match(NAME_PATTERN)
    if (!match) continue

    const minWidth = toPixels(root.getPropertyValue(property))
    if (minWidth === null || minWidth < 0 || minWidth > 10000) continue

    const name = normalizeName(match[1])
    found.set(minWidth, {
      id: name,
      name,
      minWidth,
      mapping: { cssVariable: property },
    })
  }

  const breakpoints = [...found.values()].sort((a, b) => a.minWidth - b.minWidth)

  return breakpoints.length >= 2
    ? { breakpoints, source: 'css-variable' }
    : { breakpoints: [], source: 'none' }
}
