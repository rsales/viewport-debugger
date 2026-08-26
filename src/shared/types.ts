export type BreakpointSource = 'detected' | 'default' | 'custom'

export interface BreakpointMapping {
  cssVariable?: string
  mediaQuery?: string
}

export interface Breakpoint {
  id: string
  name: string
  minWidth: number
  mapping?: BreakpointMapping
}

export interface SiteBreakpointConfig {
  source: BreakpointSource
  breakpoints: Breakpoint[]
}

export interface ViewportInfo {
  width: number
  height: number
  devicePixelRatio: number
  breakpoint: string
}

export interface ExtensionMessage {
  type: 'SET_ENABLED' | 'SET_BREAKPOINTS'
  enabled?: boolean
  config?: SiteBreakpointConfig
}
