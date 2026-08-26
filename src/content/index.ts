import type { ExtensionMessage } from '../shared/types'
import { createOverlay } from './overlay'

const overlay = createOverlay()

function setEnabled(enabled: boolean) {
  overlay.setVisible(enabled)
}

chrome.storage.local.get({ enabled: true }, (result) => {
  setEnabled(result.enabled !== false)
})

chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  if (message?.type === 'SET_ENABLED') {
    setEnabled(message.enabled)
  }
})
