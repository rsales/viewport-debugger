export interface ViewportInfo {
  width: number
  height: number
  devicePixelRatio: number
  breakpoint: string
}

export interface ExtensionMessage {
  type: 'SET_ENABLED'
  enabled: boolean
}
