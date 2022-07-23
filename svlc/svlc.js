// This is a custom-written wrapper around the Svelte compiler to take advantage of electron's require() and native import.
// It is beneficial to have such a thing, because we know exactly what features are supported by this browser,
// and we don't need to include legacy support like a lot of bundlers do.


const { compile, walk } = require("svelte/compiler")
const argvParse = require("argv-parse")
const yaml = require('yaml')
const fs = require("fs")
const path = require("path")

let argv = argvParse({
  targets: {
    type: 'array',
    alias: 't'
  },
  out: {
    type: 'string',
    alias: 'o'
  },
  root: {
    type: 'string',
    alias: 'r'
  },
  esm: {
    type: 'boolean'
  },
  dev: {
    type: 'boolean',
    alias: 'd'
  }
})

let root = argv.root || '.';

function getConfigFile() {
  let p;

  if (fs.existsSync(path.join(root, 'sveltec.yml'))) {
    p = fs.readFileSync(path.join(root, 'sveltec.yml'), 'utf-8')
    
  } else if (fs.existsSync(path.join(root, 'sveltec.yaml'))) {
    p = fs.readFileSync(path.join(root, 'sveltec.yaml'), 'utf-8')
    
  } else {
    console.error(` Error! No sveltec.yml || sveltec.yaml in the root directory! (${root})`)
    process.exit(1)
  }

  return p
}
function validateConfig(con) {
  let final = { targets: [], targetMap: {}, out: '' };

  function err(...strs) {
    console.error("  Invalid config file:", ...strs, con)
    process.exit(1)
  }
  function mustHave(prop, moretxt) {
    let a = prop in con;
    if (!a) {
      err("Config must have", prop, moretxt || '')
    }
  }

  mustHave('target')
  mustHave('output')

  if (con.target && typeof con.target != 'string') {
    err(".target must be a string")
  }
  if (con.output && typeof con.output != 'string') {
    err(".output must be a string")
  }

  function walk(pth) {
    if (fs.lstatSync(pth).isDirectory()) {
      fs.readdirSync(pth).forEach(f => {
        try { fs.mkdirSync(path.join(root, con.output, path.normalize(pth).replace(path.join(root, con.target), ''))) } catch(e){}
        walk(path.join(pth, f))
      })

    } else if (pth.endsWith('.svelte')) {
      final.targetMap[pth] = path.join(root, con.output, path.normalize(pth).replace(path.join(root, con.target), ''))

    } else {
      fs.copyFileSync(pth, path.join(root, con.output, path.normalize(pth).replace(path.join(root, con.target), '')))
    }
  }

  let pth = path.join(root, con.target);
  console.log(' Compiling from', pth);

  if (!fs.existsSync(pth)) {
    err(`No such target as ${pth}! Check the spelling?`)

  } else {
    walk(pth)
  }

  final.out = con.output;
  final.in = con.targets;
  final.options = con.options || {};
  return final;
}


if (argv._ && argv._[0] && argv._[0].endsWith('svelte')) {
  let result = compile(fs.readFileSync(argv._[0], 'utf-8'), {
    filename: argv._[0],
    format: argv.esm ? 'esm' : 'cjs',
    dev: argv.dev,
    css: true,
    preserveComments: argv.dev,
    enableSourcemap: false,
    generate: 'dom'
  })

  result.warnings.forEach(w => {
    console.warn("   WARNING:", w.toString())
  })

  fs.writeFileSync(argv._[0] + '.js', result.js.code)
  console.log(`   The compiled code: ${argv._[0] + '.js'}`)
  
} else {
  let config = validateConfig(yaml.parse(getConfigFile()))
  
  for (let p in config.targetMap) {
    let result = compile(fs.readFileSync(p, 'utf-8'), {
      filename: p,
      format: config.options.esm ? 'esm' : 'cjs',
      dev: config.options.dev ? true : argv.dev,
      css: true,
      preserveComments: config.options.dev,
      enableSourcemap: false,
      sveltePath: config.options.sveltePath || 'svelte',
      generate: 'dom'
    })

    result.warnings.forEach(w => {
      console.warn(`   WARNING in ${p}:`, w.toString())
    })

    if (config.options.omitJSExtension) {
      fs.writeFileSync(config.targetMap[p], result.js.code)
      console.log(`   The compiled code: ${config.targetMap[p]}`)

    } else {
      fs.writeFileSync(config.targetMap[p] + '.js', result.js.code)
      console.log(`   The compiled code: ${config.targetMap[p] + '.js'}`)
    }
  }
}