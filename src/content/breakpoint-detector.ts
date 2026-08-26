import type { Breakpoint } from '../shared/types'

interface DetectionResult {
  breakpoints: Breakpoint[]
  source: 'css-variable' | 'media-query' | 'mixed' | 'none'
}

const NAME_PATTERN = /(?:breakpoint|breakpoints|bp)[-_]?([a-z0-9_-]+)/i
const VALUE_PATTERN = /^(-?\d*\.?\d+)(px|rem|em)$/i

function toPixels(value: string): number | null {
  const match = value.trim().match(VALUE_PATTERN)
  if (!match) return null

  const number = Number(match[1])
  if (!Number.isFinite(number)) return null

  const unit = match[2].toLowerCase()
  if (unit === 'px') return number

  const rootFontSize = Number.parseFloat(
    getComputedStyle(document.documentElement).fontSize,
  )

  return Number.isFinite(rootFontSize) ? number * rootFontSize : null
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[_\s]+/g, '-')
}

function isLikelyBreakpointName(name: string): boolean {
  const normalized = normalizeName(name)
  return /^(base|xs|sm|md|lg|xl|2xl|xxl|xsmall|small|medium|large|xlarge|xxlarge|mobile|tablet|desktop|wide)$/.test(normalized)
}

function collectCustomProperties(): Breakpoint[] {
  const found = new Map<number, Breakpoint>()
  const root = getComputedStyle(document.documentElement)

  for (let index = 0; index < root.length; index += 1) {
    const property = root.item(index)
    if (!property.startsWith('--')) continue

    const match = property.match(NAME_PATTERN)
    if (!match) continue

    const name = normalizeName(match[1])
    if (!isLikelyBreakpointName(name)) continue

    const minWidth = toPixels(root.getPropertyValue(property))
    if (minWidth === null || minWidth < 0 || minWidth > 10000) continue

    found.set(minWidth, {
      id: name,
      name,
      minWidth,
    })
  }

  return [...found.values()].sort((a, b) => a.minWidth - b.minWidth)
}

function collectMediaQueries(): Breakpoint[] {
  const found = new Map<number, Breakpoint>()

  function inspectRules(rules: CSSRuleList) {
    for (let index = 0; index < rules.length; index += 1) {
      const rule = rules[index]

      if (rule instanceof CSSMediaRule) {
        const match = rule.conditionText.match(/\(\s*min-width\s*:\s*([^\)]+)\)/i)
        if (match) {
          const minWidth = toPixels(match[1])
          if (minWidth !== null && minWidth > 0 && minWidth <= 10000) {
            found.set(minWidth, {
              id: `media-${minWidth}`,
              name: `${minWidth}px`,
              minWidth,
            })
          }
        }

        try {
          inspectRules(rule.cssRules)
        } catch {
          // Cross-origin stylesheets can expose a CSSMediaRule whose nested
          // rules are inaccessible. The media query itself is still useful.
        }
      } else if (rule instanceof CSSGroupingRule && 'cssRules' in rule) {
        try {
          inspectRules(rule.cssRules)
        } catch {
          // Ignore inaccessible nested rules.
        }
      }
    }
  }

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      if (sheet.cssRules) inspectRules(sheet.cssRules)
    } catch {
      // Cross-origin stylesheet: CSSOM access is blocked by the browser.
    }
  }

  return [...found.values()].sort((a, b) => a.minWidth - b.minWidth)
}

export function detectBreakpoints(): DetectionResult {
  const variables = collectCustomProperties()
  const mediaQueries = collectMediaQueries()

  if (variables.length >= 2) {
    return {
      breakpoints: variables,
      source: mediaQueries.length ? 'mixed' : 'css-variable',
    }
  }

  if (mediaQueries.length >= 2) {
    return {
      breakpoints: mediaQueries,
      source: 'media-query',
    }
  }

  return {
    breakpoints: [],
    source: 'none',
  }
}
