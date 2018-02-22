import babel from 'rollup-plugin-babel'
import uglify from 'rollup-plugin-uglify'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

const { BUILD_ENV, BUILD_FORMAT } = process.env

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
      plugins: ['transform-object-rest-spread', 'transform-class-properties'],
      exclude: 'node_modules/**',
    }),
  ],
  external: ['shallowequal', 'react', 'exenv'],
}

if (BUILD_FORMAT === 'umd') {
  // In the browser build, include our smaller dependencies
  // so users only need to include React
  config.external = ['react']
  config.plugins.push(
    resolve(),
    commonjs({
      include: /node_modules/,
    }),
  )
}

if (BUILD_ENV === 'production') {
  config.plugins.push(uglify())
}

export default config
