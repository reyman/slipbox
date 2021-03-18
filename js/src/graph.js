const { check, DomWriter, Router } = require('@lggruspe/fragment-router')
const { isHome, isNote, isTag } = require('./filters.js')
const cytoscape = require('cytoscape')

const router = new Router()
const writer = new DomWriter(router)
const secondaryWriter = new DomWriter(router)

function clusterElements (slipbox, tag) {
  const edges = slipbox.cy.edges(`[tag="${tag}"]`)
  const nodes = edges.connectedNodes()
  return nodes.union(edges.filter(e => e.data('source') !== e.data('target')))
}

function neighborElements (slipbox, id) {
  const node = slipbox.cy.getElementById(id)

  const incomingEdges = new Set()
  const incomers = node.incomers().edges('edge[tag]')
  while (incomers.length > 0) {
    const edge = incomers.pop()
    const tag = edge.data('tag')
    if (incomingEdges.has(edge)) {
      continue
    }
    incomers.push(...edge.source().incomers(`edge[tag="${tag}"]`))
    incomingEdges.add(edge)
  }

  const outgoingEdges = new Set()
  const outgoers = node.outgoers().edges('edge[tag]')
  while (outgoers.length > 0) {
    const edge = outgoers.pop()
    const tag = edge.data('tag')
    if (outgoingEdges.has(edge)) {
      continue
    }
    outgoers.push(...edge.target().outgoers(`edge[tag="${tag}"]`))
    outgoingEdges.add(edge)
  }

  const edges = slipbox.cy.collection().union(Array.from(incomingEdges)).union(Array.from(outgoingEdges))
  const nodes = edges.connectedNodes()
  const neighbors = node.openNeighborhood()
  const eles = nodes.union(edges).union(neighbors)
    .filter(e => e.isNode() || e.data('source') !== e.data('target'))

  const clone = eles.getElementById(id).clone()
  clone.data('bgColor', 'black')
  return clone.union(eles)
}

function createGraphArea () {
  const div = document.createElement('div')
  div.classList.add('slipbox-graph-cytoscape')
  return div
}

function createInfoArea () {
  const div = document.createElement('div')
  div.classList.add('slipbox-graph-info')
  div.innerHTML = `
    <h3><a href=""></a></h3>
    <p></p>
  `
  return div
}

function createPageCytoscape (container, infoContainer) {
  const cy = cytoscape({
    container,
    selectionType: 'additive',
    style: [
      {
        selector: 'node',
        style: {
          label: 'data(label)',
          height: '2em',
          width: '2em',
          shape: 'round-rectangle',
          color: 'black',
          'background-color': 'data(bgColor)',
          'text-wrap': 'wrap',
          'text-max-width': 100
        }
      },
      {
        selector: 'edge',
        style: {
          width: 2,
          'curve-style': 'bezier',
          'line-color': 'black',
          'line-style': 'solid',
          'target-arrow-color': 'black',
          'target-arrow-shape': 'triangle'
        }
      }
    ]
  })
  const a = infoContainer.querySelector('.slipbox-graph-info a')
  const p = infoContainer.querySelector('.slipbox-graph-info p')
  cy.on('select', 'node', event => {
    const id = event.target.data('id')
    a.textContent = event.target.data('title')
    a.href = '#' + id
    p.textContent = event.target.data('filename')
    event.target.data('label', id)
  })
  cy.on('unselect', 'node', event => {
    a.textContent = ''
    p.textContent = ''
    event.target.data('label', event.target.data('title'))
  })
  return cy
}

function changePageCytoscapeLayout (cy, layout = 'breadthfirst') {
  if (layout === 'cose') {
    cy.layout({
      name: 'cose',
      nodeDimensionsIncludeLabels: true,
      numIter: 300,
      fit: true
    }).run()
  } else {
    cy.layout({
      name: 'breadthfirst',
      spacingFactor: 1.0,
      fit: true,
      directed: true,
      avoidOverlap: true,
      nodeDimensionsIncludeLabels: true
    }).run()
  }
}

function renderGraph (elements, layout = 'breadthfirst') {
  const graphContainer = createGraphArea()
  const infoContainer = createInfoArea()
  writer.render(graphContainer)
  secondaryWriter.render(infoContainer)
  router.onExit(() => {
    writer.restore()
    secondaryWriter.restore()
  })
  const cy = createPageCytoscape(graphContainer, infoContainer)
  cy.add(elements)
  changePageCytoscapeLayout(cy, layout)
}

router.route(
  check(isNote),
  req => {
    const elements = neighborElements(window.slipbox, req.id)
    if (elements.length >= 2) {
      router.defer(() => renderGraph(elements, 'breadthfirst'))
    }
  }
)

router.route(
  check(isTag),
  req => {
    const elements = clusterElements(window.slipbox, '#' + req.id.slice(5))
    if (elements.length >= 2) {
      router.defer(() => renderGraph(elements, 'breadthfirst'))
    }
  }
)

router.route(
  check(isHome),
  req => {
    const elements = window.slipbox.cy.elements()
      .filter(e => e.isNode() || e.data('source') !== e.data('target'))
    if (elements.length >= 2) {
      const layout = elements.nodes().length > 30 ? 'cose' : 'breadthfirst'
      router.defer(() => renderGraph(elements, layout))
    }
  }
)

router.route(() => writer.restore())

function init () {
  const container = document.createElement('div')
  document.body.appendChild(container)
  writer.options.container = container
  secondaryWriter.options.container = document.getElementById('secondary')
}

module.exports = { router, init }