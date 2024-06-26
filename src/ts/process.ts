// Manages command-line arguments and second instances

import argvParse from "argv-parse";
import * as userData from "./userdata";
import { app, dialog } from 'electron'
import { getTabWindowByID, newTabWindow } from './windows'
import { createTab } from './tabs'
import * as pathModule from 'path'
import $ from './common'
import { TabOptions } from "./types";
import terminate from "terminate";

type Spec = {
  [key: string]: {
    type: 'boolean' | 'array' | 'string',
    alias?: string
  }
}
type ArgvParse = <S extends Spec>(spec?: S) => {
  [name in keyof S]: any
} & { _: any[] }

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
  userData.control.switches.forEach((f) => {
    app.commandLine.appendArgument(f)
  })
  userData.control.arguments.forEach(({ name, value }) => {
    app.commandLine.appendSwitch(name, value)
  })
}

process.on('uncaughtException', (e) => {
  dialog.showErrorBox('Error', e.stack);
  console.error('!', e);
})

export function init() {
  if (argv.help) {
    console.log('(help)')
  }
  let lastTabs: TabOptions[] = [];

  let { onStart } = userData.config.get().behaviour;
  let { windows } = userData.lastlaunch.get()
  if (windows.length > 0 && windows[0].length > 0 && onStart.type == 'last-tabs') {
    windows.forEach(tabs => {
      lastTabs = tabs
        .filter(t => t.title && t.url) // sometimes the title and url are empty strings; TODO: fix that somehow
        .map((t, i) => {
          return {
            url: t.url,
            background: i != 0, // only select the first tab
            initialFavicon: t.faviconURL,
            initialTitle: t.title,
            isOpenedAtStart: true,
            isGhost: i != 0
          }
        })
      ;
    })
  }

  if (lastTabs.length < 1) lastTabs = [{ url: $.newTabUrl, isOpenedAtStart: true }];

  async function actArgv(argv: ReturnType<ArgvParse>, workingDir: string, isAlreadyLaunched?: boolean) {
    if (argv._?.[0]) {
      // Has an argument
      let urlOrPath = argv._?.[0];
      let url: string;
      if (urlOrPath.startsWith('http:') || urlOrPath.startsWith('https:') || urlOrPath.startsWith('nereid:') || urlOrPath.startsWith('ftp:')) {
        url = argv._[0]

      } else {
        // Not a URL, must be a file path
        url = 'file:///' + pathModule.resolve(workingDir, urlOrPath).replaceAll('\\', '/')
      }
      if (!isAlreadyLaunched) {
        // First time launching, an argument with a url.
        await newTabWindow([...lastTabs, { url, private: argv.private, isOpenedAtStart: true }])

      } else if (argv['new-window']) {
        // Second instance, --new-window
        await newTabWindow([{ url, private: argv.private, isOpenedAtStart: true }])

      } else {
        let win = getTabWindowByID(0);
        createTab(win, { url, private: argv.private, isOpenedAtStart: true })
      }

    } else if (!isAlreadyLaunched) {
      if (userData.config.get().welcomePhase <= 4) {
        await newTabWindow([{ url: 'nereid://welcome' }]);
        getTabWindowByID(0).focus();
        return;
      }
      // This is the first launch, no arguments.
      if (onStart.type == 'page') {
        await newTabWindow([ { url: onStart.url, isOpenedAtStart: true } ])

      } else if (onStart.type == 'new-tab') {
        await newTabWindow([ { url: $.newTabUrl, isOpenedAtStart: true } ])

      } else {
        await newTabWindow(lastTabs);
      }
    } else {
      let win = getTabWindowByID(0);
      createTab(win, { url: $.newTabUrl, private: argv.private, isOpenedAtStart: true })
    }
    getTabWindowByID(0).focus();
  }

  if (argv['second-instance'] || app.requestSingleInstanceLock({ argv: JSON.stringify(argv) })) {
    app.on('second-instance', async(_e, rawArgv, workDir, data) => {
      console.log('got second instance', rawArgv, 'data:', data);

      if (!data || !(data as any).argv || rawArgv.length == 0) return; // rawArgv.length == 0 if started by another user

      let argv = JSON.parse((data as any).argv);

      await actArgv(argv, workDir, true)
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

  actArgv(argv, process.cwd()).catch(console.error)
}

export async function kill(pid: number) {
  const processes = app.getAppMetrics();

  if (!processes.find(p => p.pid = pid)) throw "Tried to kill a non-browser process";
  return await terminate(pid);
}