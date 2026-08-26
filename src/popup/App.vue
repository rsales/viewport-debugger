<script setup lang="ts">
import { onMounted, ref } from 'vue'

const enabled = ref(true)
const error = ref('')

onMounted(() => {
  chrome.storage.local.get({ enabled: true }, (result) => {
    enabled.value = result.enabled !== false
  })
})

function toggle() {
  error.value = ''
  enabled.value = !enabled.value

  chrome.storage.local.set({ enabled: enabled.value }, () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id

      if (tabId === undefined) {
        error.value = 'No active tab found.'
        return
      }

      chrome.tabs.sendMessage(
        tabId,
        { type: 'SET_ENABLED', enabled: enabled.value },
        () => {
          if (chrome.runtime.lastError) {
            error.value = 'This page does not allow extensions.'
          }
        },
      )
    })
  })
}
</script>

<template>
  <main class="popup">
    <header class="popup__header">
      <div>
        <p class="popup__eyebrow">Layout tool</p>
        <h1>Viewport Debugger</h1>
      </div>
      <span class="popup__version">0.1</span>
    </header>

    <section class="popup__card">
      <div>
        <strong>Viewport overlay</strong>
        <p>Show the current viewport size while resizing the browser.</p>
      </div>

      <button
        type="button"
        class="switch"
        :class="{ 'switch--on': enabled }"
        :aria-pressed="enabled"
        :aria-label="enabled ? 'Disable viewport overlay' : 'Enable viewport overlay'"
        @click="toggle"
      >
        <span class="switch__thumb" />
      </button>
    </section>

    <p v-if="error" class="popup__error" role="alert">{{ error }}</p>

    <footer class="popup__footer">
      <span>Chrome Extension · Manifest V3</span>
    </footer>
  </main>
</template>

<style>
* {
  box-sizing: border-box;
}

html,
body,
#app {
  width: 100%;
  min-width: 320px;
  margin: 0;
}

body {
  background: #111113;
  color: #f7f7f8;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

button {
  font: inherit;
}

.popup {
  width: 360px;
  padding: 18px;
}

.popup__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.popup__eyebrow {
  margin: 0 0 5px;
  color: #8b8b92;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: 18px;
  letter-spacing: -0.02em;
}

.popup__version {
  padding: 5px 7px;
  border: 1px solid #2d2d31;
  border-radius: 6px;
  color: #8b8b92;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.popup__card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px;
  border: 1px solid #2d2d31;
  border-radius: 10px;
  background: #18181b;
}

.popup__card strong {
  display: block;
  margin-bottom: 5px;
  font-size: 13px;
}

.popup__card p {
  max-width: 250px;
  margin: 0;
  color: #8b8b92;
  font-size: 12px;
  line-height: 1.45;
}

.switch {
  flex: 0 0 auto;
  width: 42px;
  height: 24px;
  padding: 2px;
  border: 0;
  border-radius: 999px;
  background: #3a3a3f;
  cursor: pointer;
  transition: background 140ms ease;
}

.switch:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.switch--on {
  background: #f7f7f8;
}

.switch__thumb {
  display: block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #f7f7f8;
  transition: transform 140ms ease, background 140ms ease;
}

.switch--on .switch__thumb {
  background: #111113;
  transform: translateX(18px);
}

.popup__error {
  margin: 10px 2px 0;
  color: #ff9b9b;
  font-size: 11px;
  line-height: 1.4;
}

.popup__footer {
  margin-top: 14px;
  color: #66666d;
  font-size: 10px;
}
</style>
