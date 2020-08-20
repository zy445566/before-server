const {getStaticPath} = require('./util/index')
const path = require('path')
const html = require('rollup-plugin-html')
const md = require('rollup-plugin-md')
const alias  = require('@rollup/plugin-alias')
export default {
    input: 'ui/src/app.js',
    plugins: [
        alias({
            entries: [
                { find: '@', replacement: path.join(__dirname, 'ui/src') },
            ]
        }),
        html({
            include: '**/*.html'
        }),
        md(),
    ],
    output: {
      file: path.join(getStaticPath(),'bundle.js'),
      format: 'esm'
    },
    watch: {
        include: 'ui/**'
    }
  };