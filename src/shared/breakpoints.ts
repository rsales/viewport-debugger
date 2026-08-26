import type { Breakpoint } from './types'

export const DEFAULT_BREAKPOINTS: Breakpoint[] = [
  { id: 'base', name: 'Base', minWidth: 0 },
  { id: 'sm', name: 'sm', minWidth: 640 },
  { id: 'md', name: 'md', minWidth: 768 },
  { id: 'lg', name: 'lg', minWidth: 1024 },
  { id: 'xl', name: 'xl', minWidth: 1280 },
  { id: '2xl', name: '2xl', minWidth: 1536 },
]

export function sortBreakpoints(breakpoints: Breakpoint[]): Breakpoint[] {
  return [...breakpoints].sort((a, b) => a.minWidth - b.minWidth)
}

export function getBreakpoint(
  width: number,
  breakpoints: Breakpoint[] = DEFAULT_BREAKPOINTS,
): Breakpoint {
  const sorted = sortBreakpoints(breakpoints)
  let current = sorted[0] ?? DEFAULT_BREAKPOINTS[0]

  for (const breakpoint of sorted) {
    if (width >= breakpoint.minWidth) {
      current = breakpoint
    } else {
      break
    }
  }

  return current
}

export function getBreakpointState(width: number, breakpoints: Breakpoint[]) {
  const sorted = sortBreakpoints(breakpoints)
  const index = sorted.findIndex((breakpoint) => breakpoint.id === getBreakpoint(width, sorted).id)
  const current = sorted[index] ?? sorted[0] ?? DEFAULT_BREAKPOINTS[0]

  return {
    current,
    previous: index > 0 ? sorted[index - 1] : undefined,
    next: index >= 0 ? sorted[index + 1] : undefined,
    distanceToNext: sorted[index + 1]
      ? Math.max(0, sorted[index + 1].minWidth - width)
      : undefined,
  }
}
