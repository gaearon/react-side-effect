import babel from 'rollup-plugin-babel'
import uglify from 'rollup-plugin-uglify'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

const { BUILD_ENV } = process.env

const config = {
  input: 'src/index.js',
  output: {
    name: 'withSideEffect',
    globals: {
      react: 'React',
    },
  },
  plugins: [
    babel({
      babelrc: false,
      presets: ['react', ['env', { loose: true, modules: false }]],
      plugins: [
        'transform-object-rest-spread',
        'transform-class-properties',
        'add-module-exports',
      ],
      exclude: 'node_modules/**',
    }),
  ],
  external: ['shallowequal', 'react', 'exenv'],
}

if (BUILD_ENV === 'production') {
  config.plugins.push(
    ...[
      resolve(),
      commonjs({
        include: /node_modules/,
      }),
      uglify(),
    ],
  )
  // In the production browser build, include our smaller dependencies
  // so users only need to include React
  config.external = ['react']
}

export default config
