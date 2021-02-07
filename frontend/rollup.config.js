import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'

export default {
  input: 'src/index.js',
  output: {
    exports: 'auto',
    file: 'dist/frontend.js',
    paths: {
      cytoscape: 'https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.17.1/cytoscape.esm.min.js'
    },
  },
  external: ['cytoscape'],
  plugins: [commonjs(), nodeResolve()]
}
