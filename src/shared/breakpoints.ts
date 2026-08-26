export interface Breakpoint {
  name: string
  minWidth: number
}

export const BREAKPOINTS: Breakpoint[] = [
  { name: 'XS', minWidth: 0 },
  { name: 'SM', minWidth: 640 },
  { name: 'MD', minWidth: 768 },
  { name: 'LG', minWidth: 1024 },
  { name: 'XL', minWidth: 1280 },
  { name: '2XL', minWidth: 1536 },
]

export function getBreakpoint(width: number): string {
  let current = BREAKPOINTS[0]

  for (const breakpoint of BREAKPOINTS) {
    if (width >= breakpoint.minWidth) {
      current = breakpoint
    } else {
      break
    }
  }

  return current.name
}
