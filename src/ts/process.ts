// Manages command-line arguments and second instances

import * as _argvParse from "argv-parse";
import { control } from "./userdata";
import { app } from 'electron'
import { getTabWindowByID, newWindow } from './windows'
import { createTab } from './tabs'
import * as pathModule from 'path'
import $ from './vars'

type Spec = {
  [key: string]: {
    type: 'boolean' | 'array' | 'string',
    alias?: string
  }
}
type ArgvParse = <S extends Spec>(spec?: S) => {
  [name in keyof S]: any
} & { _: any[] }

const argvParse: ArgvParse = _argvParse;

const argv = argvParse({
  'second-instance': {
    type: 'boolean'
  },
  headless: {
    type: 'string'
  },
  search: {
    type: 'string'
  },
  'new-window': {
    type: 'boolean',
    alias: 'N'
  },
  help: {
    type: 'boolean',
    alias: 'h'
  },
  private: {
    type: 'boolean',
    alias: 'P'
  },
})

if (!global.isSafeMode) {
  control.switches.forEach((f) => {
    app.commandLine.appendArgument(f)
  })
  control.arguments.forEach(({ name, value }) => {
    app.commandLine.appendSwitch(name, value)
  })
}

/* for (const arg in argv) {
  // enable runtime flags
  if (!arg.startsWith('m:')) continue;

  if (argv[arg] == true) {
    config.extendFlags(arg)
    
  } else {
    config.extendFlags({ switch: arg, value: argv[arg] })
  }
} */

export function init() {
  if (argv.help) {
    console.log('(help)')
  }

  function actArgv(argv: ReturnType<ArgvParse>, workingDir: string, shouldOpenWindow?: boolean) {
    if (argv._?.[0]) {
      let win = getTabWindowByID(0);
      let urlOrPath = argv._?.[0];
      let url: string;
      if (urlOrPath.startsWith('http:') || urlOrPath.startsWith('https:') || urlOrPath.startsWith('nereid:') || urlOrPath.startsWith('ftp:')) {
        url = argv._[0]
        
      } else {
        url = 'file:///' + pathModule.resolve(workingDir, urlOrPath).replaceAll('\\', '/')
      }
      if (argv['new-window']) {
        newWindow([{ url, private: argv.private }])
      } else {
        createTab(win, { url, private: argv.private })
      }

    } else if (shouldOpenWindow) {
      newWindow([{ url: $.newTabUrl }])
    }
  }

  if (argv['second-instance'] || app.requestSingleInstanceLock({ argv: JSON.stringify(argv) })) {
    app.on('second-instance', (_e, rawArgv, workDir, data) => {
      console.log('got second instance', rawArgv, 'data:', data);
      
      if (!data || !(data as any).argv || rawArgv.length == 0) return; // rawArgv.length == 0 if started by another user

      let argv = JSON.parse((data as any).argv);

      actArgv(argv, workDir, true)
    })
    app.on('open-url', (e, url) => {
      e.preventDefault()

      let win = getTabWindowByID(0);
      createTab(win, { url })
    })
    app.on('open-file', (e, path) => {
      e.preventDefault()

      let win = getTabWindowByID(0);
      createTab(win, { url: 'file:///' + pathModule.resolve(process.cwd(), path).replaceAll('\\', '/') })
    })

  } else {
    console.log('Nereid is already launched. Necessary data has been sent. Use the --second-instance flag to bypass the single instance limitation.');
    app.exit()
  }

  actArgv(argv, process.cwd())
}
