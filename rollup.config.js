const {getStaticPath} = require('./util/index')
const path = require('path')
const alias  = require('@rollup/plugin-alias')
const {nodeResolve}  = require('@rollup/plugin-node-resolve')
const commonjs  = require('@rollup/plugin-commonjs')
const { createFilter }= require('@rollup/pluginutils');
export default {
    input: 'ui/src/app.js',
    plugins: [
        alias({
            entries: [
                { find: '@', replacement: path.join(__dirname, 'ui/src') },
            ]
        }),
        (function text() {
            return {
                name: 'text',
                transform ( data, id ) {
                    const filter = createFilter( [ '**/*.md','**/*.txt','**/*.html'], undefined );
                    if ( !filter( id ) ) return null;
                    return {
                        code: `export default ${JSON.stringify(data.toString())};`,
                        map: { mappings: '' }
                    };
                }
            }
        })(),
        commonjs(),
        nodeResolve()
    ],
    output: {
      file: path.join(getStaticPath(),'bundle.js'),
      format: 'esm'
    },
    watch: {
        include: 'ui/**'
    }
  };