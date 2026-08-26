export interface GridOverlayOptions {
  columns?: number
  gutter?: number
  margin?: number
}

export interface GridOverlayController {
  setVisible(visible: boolean): void
  destroy(): void
}

const DEFAULTS: Required<GridOverlayOptions> = {
  columns: 12,
  gutter: 24,
  margin: 24,
}

export function createGridOverlay(options: GridOverlayOptions = {}): GridOverlayController {
  const config = { ...DEFAULTS, ...options }
  const root = document.createElement('div')
  root.id = 'viewport-debugger-grid'
  root.setAttribute('aria-hidden', 'true')

  const style = document.createElement('style')
  style.textContent = `
    #viewport-debugger-grid {
      position: fixed;
      inset: 0;
      z-index: 2147483646;
      pointer-events: none;
      display: none;
      padding: 0 ${config.margin}px;
      box-sizing: border-box;
    }

    #viewport-debugger-grid.is-visible {
      display: block;
    }

    #viewport-debugger-grid .grid {
      width: 100%;
      max-width: 1280px;
      height: 100%;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(${config.columns}, minmax(0, 1fr));
      column-gap: ${config.gutter}px;
    }

    #viewport-debugger-grid .column {
      position: relative;
      height: 100%;
      background: rgba(127, 90, 240, 0.08);
      border-left: 1px solid rgba(127, 90, 240, 0.28);
      border-right: 1px solid rgba(127, 90, 240, 0.28);
      box-sizing: border-box;
    }

    #viewport-debugger-grid .label {
      position: absolute;
      top: 8px;
      left: 50%;
      transform: translateX(-50%);
      min-width: 16px;
      padding: 2px 4px;
      border-radius: 3px;
      background: rgba(40, 40, 47, 0.88);
      color: #d6d6dc;
      font: 500 9px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
      text-align: center;
    }

    #viewport-debugger-grid .gutter {
      position: absolute;
      top: 0;
      bottom: 0;
      width: ${config.gutter}px;
      transform: translateX(-50%);
      background: rgba(127, 90, 240, 0.035);
    }

    @media (max-width: 1023px) {
      #viewport-debugger-grid .grid {
        grid-template-columns: repeat(8, minmax(0, 1fr));
      }
      #viewport-debugger-grid .column:nth-child(n+9) {
        display: none;
      }
    }

    @media (max-width: 767px) {
      #viewport-debugger-grid .grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
      #viewport-debugger-grid .column:nth-child(n+5) {
        display: none;
      }
    }
  `

  const grid = document.createElement('div')
  grid.className = 'grid'

  for (let index = 0; index < config.columns; index += 1) {
    const column = document.createElement('div')
    column.className = 'column'

    const label = document.createElement('span')
    label.className = 'label'
    label.textContent = String(index + 1)
    column.appendChild(label)

    grid.appendChild(column)
  }

  root.append(style, grid)
  document.documentElement.appendChild(root)

  return {
    setVisible(visible) {
      root.classList.toggle('is-visible', visible)
    },
    destroy() {
      root.remove()
    },
  }
}
