import babel from 'rollup-plugin-babel';
import pkg from './package.json';

export default {
  input: 'src/index.js',
  output: [
    { file: pkg.main, format: 'cjs' }
  ],
  plugins: [
    babel({
      babelrc: false,
      presets: [
        'react',
        ['env', { targets: {uglify: true}, loose: true, modules: false }]
      ],
      plugins: [
        'transform-object-rest-spread',
        'transform-class-properties',
        'add-module-exports'
      ],
      exclude: 'node_modules/**'
    })
  ],
  external: ['shallowequal', 'react', 'exenv']
};
