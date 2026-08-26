<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { DEFAULT_BREAKPOINTS } from '../shared/breakpoints'
import type { Breakpoint, BreakpointMapping, SiteBreakpointConfig } from '../shared/types'

const BREAKPOINT_STORAGE_KEY = 'siteBreakpoints'

const enabled = ref(true)
const error = ref('')
const origin = ref('')
const source = ref<SiteBreakpointConfig['source']>('default')
const breakpoints = ref<Breakpoint[]>([])
const expandedIds = ref<string[]>([])

function withMapping(breakpoint: Breakpoint): Breakpoint {
  return {
    ...breakpoint,
    mapping: { ...(breakpoint.mapping ?? {}) },
  }
}

function getSiteKey(): string {
  return origin.value
}

function load() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0]?.url
    try {
      origin.value = url ? new URL(url).origin : ''
    } catch {
      origin.value = ''
    }

    chrome.storage.local.get(
      { enabled: true, [BREAKPOINT_STORAGE_KEY]: {} },
      (result) => {
        enabled.value = result.enabled !== false
        const profiles = result[BREAKPOINT_STORAGE_KEY] as Record<string, SiteBreakpointConfig>
        const profile = origin.value ? profiles[getSiteKey()] : undefined
        source.value = profile?.source ?? 'default'
        breakpoints.value = (profile?.breakpoints ?? DEFAULT_BREAKPOINTS).map(withMapping)
      },
    )
  })
}

function toggleExpanded(id: string) {
  expandedIds.value = expandedIds.value.includes(id)
    ? expandedIds.value.filter((item) => item !== id)
    : [...expandedIds.value, id]
}

function isExpanded(id: string): boolean {
  return expandedIds.value.includes(id)
}

function getMappingCount(mapping?: BreakpointMapping): number {
  if (!mapping) return 0
  return [mapping.cssVariable, mapping.mediaQuery].filter(Boolean).length
}

function saveBreakpoints() {
  error.value = ''

  const normalized = [...breakpoints.value]
    .filter((breakpoint) => breakpoint.name.trim() && Number.isFinite(Number(breakpoint.minWidth)))
    .map((breakpoint) => ({
      ...breakpoint,
      name: breakpoint.name.trim(),
      minWidth: Math.max(0, Number(breakpoint.minWidth)),
      mapping: breakpoint.mapping && {
        cssVariable: breakpoint.mapping.cssVariable?.trim() || undefined,
        mediaQuery: breakpoint.mapping.mediaQuery?.trim() || undefined,
      },
    }))
    .sort((a, b) => a.minWidth - b.minWidth)

  if (!origin.value || normalized.length === 0) {
    error.value = 'Breakpoints cannot be saved for this page.'
    return
  }

  const config: SiteBreakpointConfig = {
    source: 'custom',
    breakpoints: normalized,
  }

  chrome.storage.local.get({ [BREAKPOINT_STORAGE_KEY]: {} }, (result) => {
    const profiles = result[BREAKPOINT_STORAGE_KEY] as Record<string, SiteBreakpointConfig>
    profiles[getSiteKey()] = config
    chrome.storage.local.set({ [BREAKPOINT_STORAGE_KEY]: profiles }, () => {
      source.value = 'custom'
      breakpoints.value = normalized.map(withMapping)

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id
        if (tabId === undefined) return

        chrome.tabs.sendMessage(tabId, { type: 'SET_BREAKPOINTS', config }, () => {
          void chrome.runtime.lastError
        })
      })
    })
  })
}

function addBreakpoint() {
  const id = `custom-${Date.now()}`
  breakpoints.value.push(withMapping({
    id,
    name: 'custom',
    minWidth: 1440,
  }))
  expandedIds.value = [...expandedIds.value, id]
}

function removeBreakpoint(index: number) {
  const id = breakpoints.value[index]?.id
  breakpoints.value.splice(index, 1)
  if (id) expandedIds.value = expandedIds.value.filter((item) => item !== id)
}

function resetToDefault() {
  source.value = 'default'
  breakpoints.value = DEFAULT_BREAKPOINTS.map(withMapping)
  expandedIds.value = []
}

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

      chrome.tabs.sendMessage(tabId, { type: 'SET_ENABLED', enabled: enabled.value }, () => {
        if (chrome.runtime.lastError) error.value = 'This page does not allow extensions.'
      })
    })
  })
}

onMounted(load)
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
        @click="toggle"
      >
        <span class="switch__thumb" />
      </button>
    </section>

    <section v-if="origin" class="popup__breakpoints">
      <div class="section-heading">
        <div>
          <strong>Breakpoints</strong>
          <p>{{ origin }}</p>
        </div>
        <span class="source">{{ source }}</span>
      </div>

      <div class="breakpoint-list">
        <article
          v-for="(breakpoint, index) in breakpoints"
          :key="breakpoint.id"
          class="breakpoint"
          :class="{ 'breakpoint--expanded': isExpanded(breakpoint.id) }"
        >
          <button type="button" class="breakpoint__header" @click="toggleExpanded(breakpoint.id)">
            <span class="chevron" :class="{ 'chevron--open': isExpanded(breakpoint.id) }">›</span>
            <span class="breakpoint__name">{{ breakpoint.name }}</span>
            <span class="breakpoint__width">{{ breakpoint.minWidth }}px</span>
            <span v-if="getMappingCount(breakpoint.mapping)" class="mapping-badge">
              {{ getMappingCount(breakpoint.mapping) }} mapped
            </span>
          </button>

          <div v-if="isExpanded(breakpoint.id)" class="breakpoint__details">
            <label>
              <span>Name</span>
              <input v-model="breakpoint.name" aria-label="Breakpoint name" />
            </label>
            <label>
              <span>Min width</span>
              <div class="input-with-unit">
                <input v-model.number="breakpoint.minWidth" type="number" min="0" step="1" aria-label="Minimum width" />
                <em>px</em>
              </div>
            </label>

            <div class="mapping">
              <div class="mapping__heading">
                <span>Code mapping</span>
                <small>{{ getMappingCount(breakpoint.mapping) }} mapped</small>
              </div>
              <label>
                <span>CSS variable</span>
                <input
                  v-model="breakpoint.mapping!.cssVariable"
                  placeholder="--breakpoint-md"
                  aria-label="CSS variable mapping"
                />
              </label>
              <label>
                <span>Media query</span>
                <input
                  v-model="breakpoint.mapping!.mediaQuery"
                  placeholder="(min-width: 768px)"
                  aria-label="Media query mapping"
                />
              </label>
            </div>

            <button type="button" class="remove-button" @click="removeBreakpoint(index)">
              Remove breakpoint
            </button>
          </div>
        </article>
      </div>

      <div class="breakpoint-actions">
        <button type="button" class="text-button" @click="addBreakpoint">+ Add</button>
        <button type="button" class="text-button" @click="resetToDefault">Reset</button>
        <button type="button" class="save-button" @click="saveBreakpoints">Save</button>
      </div>
    </section>

    <p v-if="error" class="popup__error" role="alert">{{ error }}</p>

    <footer class="popup__footer">
      <span>Chrome Extension · Manifest V3</span>
    </footer>
  </main>
</template>

<style>
* { box-sizing: border-box; }
html, body, #app { width: 100%; min-width: 320px; margin: 0; }
body { background: #111113; color: #f7f7f8; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
button, input { font: inherit; }
.popup { width: 390px; padding: 18px; }
.popup__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.popup__eyebrow { margin: 0 0 5px; color: #8b8b92; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
h1 { margin: 0; font-size: 18px; letter-spacing: -.02em; }
.popup__version { padding: 5px 7px; border: 1px solid #2d2d31; border-radius: 6px; color: #8b8b92; font-size: 11px; }
.popup__card, .popup__breakpoints { padding: 14px; border: 1px solid #2d2d31; border-radius: 10px; background: #18181b; }
.popup__card { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.popup__card strong, .section-heading strong { display: block; margin-bottom: 5px; font-size: 13px; }
.popup__card p, .section-heading p { max-width: 260px; margin: 0; color: #8b8b92; font-size: 11px; line-height: 1.45; }
.switch { flex: 0 0 auto; width: 42px; height: 24px; padding: 2px; border: 0; border-radius: 999px; background: #3a3a3f; cursor: pointer; }
.switch--on { background: #f7f7f8; }
.switch__thumb { display: block; width: 20px; height: 20px; border-radius: 50%; background: #f7f7f8; transition: transform 140ms ease, background 140ms ease; }
.switch--on .switch__thumb { background: #111113; transform: translateX(18px); }
.popup__breakpoints { margin-top: 10px; }
.section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.source { color: #ffb066; font-size: 10px; text-transform: capitalize; }
.breakpoint-list { display: grid; gap: 5px; }
.breakpoint { overflow: hidden; border: 1px solid #303036; border-radius: 6px; background: #111113; }
.breakpoint__header { width: 100%; min-height: 34px; padding: 0 8px; border: 0; background: transparent; color: #f7f7f8; display: grid; grid-template-columns: 14px 1fr auto auto; align-items: center; gap: 6px; text-align: left; cursor: pointer; }
.breakpoint__header:hover { background: #19191d; }
.chevron { color: #77777f; font-size: 16px; line-height: 1; transition: transform 120ms ease; }
.chevron--open { transform: rotate(90deg); }
.breakpoint__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; font-size: 11px; font-weight: 600; }
.breakpoint__width { color: #ffb066; font-size: 10px; font-variant-numeric: tabular-nums; }
.mapping-badge { padding: 3px 5px; border-radius: 4px; background: #243332; color: #74d7d1; font-size: 9px; }
.breakpoint__details { padding: 10px; border-top: 1px solid #303036; display: grid; gap: 8px; }
.breakpoint__details label, .mapping label { display: grid; gap: 4px; }
.breakpoint__details label > span, .mapping label > span { color: #77777f; font-size: 9px; }
.breakpoint__details input { width: 100%; height: 27px; padding: 0 7px; border: 1px solid #303036; border-radius: 5px; outline: 0; background: #18181b; color: #f7f7f8; font-size: 10px; }
.input-with-unit { display: grid; grid-template-columns: 1fr 24px; align-items: center; gap: 5px; }
.input-with-unit em { color: #77777f; font-size: 9px; font-style: normal; }
.mapping { margin-top: 2px; padding-top: 8px; border-top: 1px solid #28282d; display: grid; gap: 7px; }
.mapping__heading { display: flex; align-items: center; justify-content: space-between; }
.mapping__heading span { color: #b8b8bf; font-size: 10px; font-weight: 600; }
.mapping__heading small { color: #66666d; font-size: 9px; }
.remove-button { justify-self: start; padding: 0; border: 0; background: transparent; color: #a66; font-size: 9px; cursor: pointer; }
.remove-button:hover { color: #ff9b9b; }
.breakpoint-actions { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
.text-button, .save-button { height: 26px; padding: 0 8px; border: 1px solid #303036; border-radius: 5px; background: #111113; color: #b8b8bf; font-size: 10px; cursor: pointer; }
.save-button { margin-left: auto; background: #f7f7f8; border-color: #f7f7f8; color: #111113; font-weight: 600; }
.popup__error { margin: 10px 2px 0; color: #ff9b9b; font-size: 11px; }
.popup__footer { margin-top: 14px; color: #66666d; font-size: 10px; }
</style>
