/**
 * @type {import('svbuild/types').Config}
 */
const config = {
  src: './svelte',
  out: './out',
  compilerOptions: {
    esm: true,
    dev: true,
    sveltePath: 'nereid://.svelte'
  },
  moduleOptions: {
    root: './js/modules',
    buildModules: true,
    buildSvelte: false,
    modulesSrc: 'node_modules'
  }
}

export default config