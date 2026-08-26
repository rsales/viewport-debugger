import { DEFAULT_BREAKPOINTS } from '../shared/breakpoints'
import type { ExtensionMessage, SiteBreakpointConfig } from '../shared/types'
import { detectBreakpoints } from './breakpoint-detector'
import { createGridOverlay } from './grid-overlay'
import { createOverlay } from './overlay'

const BREAKPOINT_STORAGE_KEY = 'siteBreakpoints'

function getSiteKey(): string {
  return window.location.origin
}

function normalizeConfig(config: SiteBreakpointConfig): SiteBreakpointConfig {
  return {
    source: config.source,
    breakpoints: [...config.breakpoints]
      .filter((breakpoint) => Number.isFinite(breakpoint.minWidth) && breakpoint.minWidth >= 0)
      .sort((a, b) => a.minWidth - b.minWidth),
  }
}

function isUsableStoredProfile(profile: SiteBreakpointConfig | undefined): boolean {
  if (!profile?.breakpoints?.length) return false
  return profile.source === 'custom' || profile.source === 'detected' || profile.source === 'default'
}

function loadSiteBreakpoints(callback: (config: SiteBreakpointConfig) => void) {
  chrome.storage.local.get({ [BREAKPOINT_STORAGE_KEY]: {} }, (result) => {
    const profiles = result[BREAKPOINT_STORAGE_KEY] as Record<string, SiteBreakpointConfig>
    const existing = profiles[getSiteKey()]

    if (isUsableStoredProfile(existing)) {
      callback(normalizeConfig(existing))
      return
    }

    const detected = detectBreakpoints()
    const config: SiteBreakpointConfig = detected.breakpoints.length >= 2
      ? {
          source: 'detected',
          breakpoints: detected.breakpoints,
        }
      : {
          source: 'default',
          breakpoints: DEFAULT_BREAKPOINTS,
        }

    profiles[getSiteKey()] = config
    chrome.storage.local.set({ [BREAKPOINT_STORAGE_KEY]: profiles }, () => {
      callback(config)
    })
  })
}

function setEnabled(
  overlay: ReturnType<typeof createOverlay>,
  grid: ReturnType<typeof createGridOverlay>,
  enabled: boolean,
) {
  overlay.setVisible(enabled)
  grid.setVisible(enabled && gridEnabled)
}

let gridEnabled = true

chrome.storage.local.get({ enabled: true }, (result) => {
  loadSiteBreakpoints((config) => {
    const overlay = createOverlay(config)
    const grid = createGridOverlay({ columns: 12, gutter: 24, margin: 24 })
    setEnabled(overlay, grid, result.enabled !== false)

    window.addEventListener('keydown', (event) => {
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey || event.key.toLowerCase() !== 'g') return
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return

      event.preventDefault()
      gridEnabled = !gridEnabled
      grid.setVisible(result.enabled !== false && gridEnabled)
    })

    chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
      if (message?.type === 'SET_ENABLED' && typeof message.enabled === 'boolean') {
        setEnabled(overlay, grid, message.enabled)
      }

      if (message?.type === 'SET_BREAKPOINTS' && message.config) {
        const normalized = normalizeConfig(message.config)
        overlay.setBreakpoints(normalized)

        chrome.storage.local.get({ [BREAKPOINT_STORAGE_KEY]: {} }, (storage) => {
          const profiles = storage[BREAKPOINT_STORAGE_KEY] as Record<string, SiteBreakpointConfig>
          profiles[getSiteKey()] = normalized
          chrome.storage.local.set({ [BREAKPOINT_STORAGE_KEY]: profiles })
        })
      }
    })
  })
})
