import { defineManifest } from '@crxjs/vite-plugin'
import packageJson from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: 'Viewport Debugger',
  short_name: 'Viewport',
  version: packageJson.version,
  description:
    'Inspect viewport dimensions and responsive breakpoints while developing websites.',
  permissions: ['storage'],
  action: {
    default_title: 'Viewport Debugger',
    default_popup: 'src/popup/index.html',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
})
