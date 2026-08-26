export type BreakpointSource = 'detected' | 'default' | 'custom'

export interface Breakpoint {
  id: string
  name: string
  minWidth: number
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
