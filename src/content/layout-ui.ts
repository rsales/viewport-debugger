import { createLayoutOverlay, scanLayoutNodes, type LayoutNode } from './layout-inspector'

export interface LayoutInspectorController {
  refresh(): void
  destroy(): void
}

function detail(node: LayoutNode): string {
  if (node.kind === 'grid') {
    const columns = node.columns ? `${node.columns} cols` : 'grid'
    const gap = node.columnGap === node.rowGap ? node.columnGap : `${node.columnGap} / ${node.rowGap}`
    return `${columns} · gap ${gap}`
  }

  return `${node.direction ?? 'row'} · gap ${node.columnGap === node.rowGap ? node.columnGap : `${node.columnGap}/${node.rowGap}`}`
}

export function createLayoutInspector(shadowRoot: ShadowRoot): LayoutInspectorController {
  const content = shadowRoot.querySelector<HTMLElement>('.viewport-debugger__content')
  if (!content) {
    return { refresh() {}, destroy() {} }
  }

  const section = document.createElement('section')
  section.className = 'viewport-debugger__layout'

  const trigger = document.createElement('button')
  trigger.type = 'button'
  trigger.className = 'viewport-debugger__layout-trigger'
  trigger.setAttribute('aria-expanded', 'false')

  const title = document.createElement('span')
  title.textContent = 'Layout'
  const count = document.createElement('span')
  count.className = 'viewport-debugger__layout-count'
  const chevron = document.createElement('span')
  chevron.className = 'viewport-debugger__layout-chevron'
  chevron.textContent = '⌄'
  trigger.append(title, count, chevron)

  const body = document.createElement('div')
  body.className = 'viewport-debugger__layout-body'
  body.hidden = true

  const gridGroup = document.createElement('div')
  gridGroup.className = 'viewport-debugger__layout-group'
  const gridLabel = document.createElement('div')
  gridLabel.className = 'viewport-debugger__layout-group-label'
  gridLabel.textContent = 'Grid'
  const gridList = document.createElement('div')

  const flexGroup = document.createElement('div')
  flexGroup.className = 'viewport-debugger__layout-group'
  const flexLabel = document.createElement('div')
  flexLabel.className = 'viewport-debugger__layout-group-label'
  flexLabel.textContent = 'Flex'
  const flexList = document.createElement('div')

  const empty = document.createElement('div')
  empty.className = 'viewport-debugger__layout-empty'
  empty.textContent = 'No grid or flex layouts detected.'

  gridGroup.append(gridLabel, gridList)
  flexGroup.append(flexLabel, flexList)
  body.append(gridGroup, flexGroup, empty)
  section.append(trigger, body)
  content.appendChild(section)

  const overlay = createLayoutOverlay()
  let open = false

  function renderItem(node: LayoutNode, list: HTMLElement) {
    const item = document.createElement('button')
    item.type = 'button'
    item.className = 'viewport-debugger__layout-item'

    const name = document.createElement('span')
    name.className = 'viewport-debugger__layout-item-name'
    name.textContent = node.selector

    const info = document.createElement('span')
    info.className = 'viewport-debugger__layout-item-info'
    info.textContent = detail(node)

    item.append(name, info)
    item.title = node.selector
    item.addEventListener('click', (event) => {
      event.stopPropagation()
      section.querySelectorAll('.viewport-debugger__layout-item.is-selected').forEach((el) => el.classList.remove('is-selected'))
      item.classList.add('is-selected')
      overlay.highlight(node)
    })

    list.appendChild(item)
  }

  function refresh() {
    const nodes = scanLayoutNodes()
    gridList.replaceChildren()
    flexList.replaceChildren()

    const grids = nodes.filter((node) => node.kind === 'grid')
    const flexes = nodes.filter((node) => node.kind === 'flex')
    count.textContent = String(nodes.length)
    gridGroup.hidden = grids.length === 0
    flexGroup.hidden = flexes.length === 0
    empty.hidden = nodes.length > 0

    grids.forEach((node) => renderItem(node, gridList))
    flexes.forEach((node) => renderItem(node, flexList))
  }

  trigger.addEventListener('click', (event) => {
    event.stopPropagation()
    open = !open
    body.hidden = !open
    trigger.setAttribute('aria-expanded', String(open))
    trigger.classList.toggle('is-open', open)
    if (open) refresh()
  })

  refresh()

  return {
    refresh,
    destroy() {
      overlay.clear()
      section.remove()
    },
  }
}
