import * as Graph from './graph.js'
import * as Model from './model.js'
import * as Search from './search.js'
import * as Toggle from './toggle.js'

window.query = new Model.Query(new Model.Database())

window.Model = Model

window.initSlipbox = function () {
  const title = document.getElementById('title-block-header')
  if (title) { title.remove() }
  Search.init()
  Toggle.init()
  Graph.init(window.query)
}