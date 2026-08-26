import type { ExtensionMessage } from '../shared/types'
import { createOverlay } from './overlay'

function setEnabled(overlay: ReturnType<typeof createOverlay>, enabled: boolean) {
  overlay.setVisible(enabled)
}

// Read the persisted state before creating/showing the overlay. This avoids a
// visible flash on page load when the extension was previously disabled.
chrome.storage.local.get({ enabled: true }, (result) => {
  const overlay = createOverlay()
  setEnabled(overlay, result.enabled !== false)

  chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
    if (message?.type === 'SET_ENABLED') {
      setEnabled(overlay, message.enabled)
    }
  })
})
