import { DEFAULT_BREAKPOINTS } from '../shared/breakpoints'
import type { ExtensionMessage, SiteBreakpointConfig } from '../shared/types'
import { detectBreakpoints } from './breakpoint-detector'
import { createLayoutInspector } from './layout-ui'
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

function setEnabled(overlay: ReturnType<typeof createOverlay>, enabled: boolean) {
  overlay.setVisible(enabled)
}

chrome.storage.local.get({ enabled: true }, (result) => {
  loadSiteBreakpoints((config) => {
    const overlay = createOverlay(config)
    const host = document.getElementById('viewport-debugger-host')
    const shadowRoot = host?.shadowRoot
    const layoutInspector = shadowRoot ? createLayoutInspector(shadowRoot) : null

    setEnabled(overlay, result.enabled !== false)

    chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
      if (message?.type === 'SET_ENABLED' && typeof message.enabled === 'boolean') {
        setEnabled(overlay, message.enabled)
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

    window.addEventListener('resize', () => layoutInspector?.refresh(), { passive: true })
  })
})
