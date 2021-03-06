const List = require('./list.js')
const Search = require('./search.js')
const { SlipboxCollection } = require('./slipbox.js')

const { Router } = require('@lggruspe/fragment-router')
const review = require('./review.js')
const graphRouter = require('./graph.js')
const router = new Router()
router.mount('review/', review.router)
router.mount('graph/', graphRouter)

window.slipbox = new SlipboxCollection()

window.initSlipbox = function () {
  const title = document.getElementById('title-block-header')
  if (title) { title.remove() }
  List.init()
  Search.init()
  router.listen()
}
