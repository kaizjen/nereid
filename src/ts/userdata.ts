// This file is responsible for providing an interface of userData: configuration etc.

import * as fs from 'fs-extra'
import * as path from 'path'
import { app, dialog } from 'electron'
import type { Configuration, LastLaunch, History, Downloads, Details, Bookmarks } from './types'
import * as JSON5 from 'json5';
import $ from './vars';
import runType from 'runtype-check';

console.time('userData init');

const { join } = path;
export const userdataDirectory = path.join(app.getPath('userData'), 'userdata')

const lastlaunchPath = join(userdataDirectory, 'lastlaunch.json');
const historyPath = join(userdataDirectory, 'history.json');
const configPath = join(userdataDirectory, 'config.json5');
const downloadsPath = join(userdataDirectory, 'downloads.json');
const bookmarksPath = join(userdataDirectory, 'bookmarks.json');
const controlPath = join(userdataDirectory, 'control.json');

let configContent: Configuration;
let lastlaunchContent: LastLaunch;
let controlContent: Details;

async function exists(path: string) {
  try {
    await fs.promises.access(path);
    return true;

  } catch (e) {
    return false;
  }
}

const { existsSync } = fs;

function writeDefaults() {
  if (!lastlaunchContent) {
    const fileContents = fs.readFileSync('src/browser/templates/lastlaunch.json', 'utf-8');
    fs.writeFile(lastlaunchPath, fileContents)
    lastlaunchContent = JSON.parse(fileContents)
  }

  if (!existsSync(historyPath)) {
    fs.writeFileSync(historyPath, '[]')
  }

  if (!configContent) {
    const fileContents = fs.readFileSync('src/browser/templates/config.json5', 'utf-8');
    fs.writeFileSync(configPath, fileContents)
    configContent = JSON5.parse(fileContents)
  }

  if (!existsSync(downloadsPath)) {
    fs.writeFileSync(downloadsPath, '[]')
  }

  if (!existsSync(bookmarksPath)) {
    const fileContents = fs.readFileSync('src/browser/templates/bookmarks.json', 'utf-8');
    fs.writeFileSync(bookmarksPath, fileContents)
  }

  if (!controlContent) {
    const fileContents = fs.readFileSync('src/browser/templates/control.json', 'utf-8');
    fs.writeFileSync(controlPath, fileContents)
    controlContent = JSON.parse(fileContents)
  }
}

function cloneObject<T extends object>(obj: T): T {
  obj = Object.assign(obj);
  for (let key in obj) {
    if (typeof obj[key] == 'object' && obj[key] != null) { obj[key as any] = cloneObject(obj[key as any]) }
  }
  return obj;
}



try {
  if (!fs.existsSync(userdataDirectory)) {
    fs.mkdirSync(userdataDirectory, { recursive: true })
    fs.copySync(
      'src/browser/templates/background_images',
      path.join(userdataDirectory, 'background_images'),
      { recursive: true }
    )
    writeDefaults()
  }
  
} catch (e) {
  dialog.showErrorBox("Unable to initialize user settings", e.toString())

  process.exit(1)
}

try {
  configContent = JSON5.parse(fs.readFileSync(configPath, 'utf-8'))
  lastlaunchContent = JSON.parse(fs.readFileSync(lastlaunchPath, 'utf-8'))
  controlContent = JSON.parse(fs.readFileSync(controlPath, 'utf-8'))

  // check the history and downloads for being readable
  JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
  JSON.parse(fs.readFileSync(downloadsPath, 'utf-8'));
  JSON.parse(fs.readFileSync(bookmarksPath, 'utf-8'));

} catch (e) {
  console.log("Couldn't read user settings:", e, ". Trying to re-write...")
  
  try {
    writeDefaults()
  } catch (e) {
    dialog.showErrorBox("Unable to read user settings.", e.toString())

    process.exit(1)
  }
}

(function() {
  // check the config file
  if (configContent.v != '0.0.1') {
    app.prependListener('ready', () => {
      const { t } = require('./i18n.js')

      let button = dialog.showMessageBoxSync({
        message: t('configVersionMismatch.title'),
        buttons: [ t('configVersionMismatch.button-overwrite'), t('configVersionMismatch.button-exit') ],
        cancelId: 1,
        defaultId: 1,
        type: 'error'
      });

      if (button == 0) {
        fs.unlinkSync(configPath);
        fs.unlinkSync(historyPath);
        fs.unlinkSync(lastlaunchPath);
        fs.unlinkSync(bookmarksPath);
        fs.unlinkSync(downloadsPath);
        app.relaunch();
        app.exit()

      } else {
        app.exit()
      }
    })
    return;
  }

  const bool_null = ['boolean' as const, null];
  let validation = runType(configContent, {
    v: 'string',
    welcomePhase: 'realnumber',
    i18n: [{
      lang: 'string',
      locale: 'string'
    }, null],
    ui: {
      theme: ['"light"', '"dark"', '"system"'],
      defaultZoomFactor: 'realnumber',
      chromeZoomFactor: 'realnumber',
      showBookmarks: ['"newtab"', '"all"', '"none"'],
      backgroundImage: 'string'
    },
    search: {
      available: [[
        {
          name: 'string',
          searchURL: 'string',
          suggestURL: 'string',
          suggestAlgorithm: ['"google-like"', '"startpage-like"', '"extension"', '"find"', str => str?.startsWith?.('extension:')],
        }
      ]],
      selectedIndex: 'number'
    },
    privacy: {
      httpsOnly: 'boolean',
      useSuggestions: 'boolean',
      hideSessionForSuggestions: 'boolean',
      alwaysClearBrowsingData: 'boolean',
      denyCrossOriginPermissions: 'boolean',
      defaultPermissions: {
        popups: bool_null,
        'media.video': bool_null,
        'media.audio': bool_null,
        displayCapture: bool_null,
        DRM: bool_null,
        geolocation: bool_null,
        notifications: bool_null,
        midi: bool_null,
        pointerLock: bool_null,
        openExternal: bool_null,
        idleDetection: bool_null,
        sensors: bool_null,
        screenWakeLock: bool_null,
        fullscreen: bool_null
      },
      sitePermissions: {
        '*': {
          'popups?': bool_null,
          'media.video?': bool_null,
          'media.audio?': bool_null,
          'displayCapture?': bool_null,
          'DRM?': bool_null,
          'geolocation?': bool_null,
          'notifications?': bool_null,
          'midi?': bool_null,
          'pointerLock?': bool_null,
          'openExternal?': bool_null,
          'idleDetection?': bool_null,
          'sensors?': bool_null,
          'screenWakeLock?': bool_null,
          'fullscreen?': bool_null,
        }
      },
      adblockerWhitelist: [['string']]
    },
    behaviour: {
      onStart: [
        {
          type: ['"new-tab"', '"last-tabs"']
        },
        {
          type: '"page"',
          url: 'string'
        }
      ],
      maxRecentTabs: 'number',
      downloadPath: ['string', null, undefined],
      spellChecker: {
        enabled: 'boolean',
        languages: [[ 'string' ]]
      },
      a11yEnabled: [ 'boolean', null ]
    }
  });
  
  if (validation == true) return;

  console.error(
    `The configuration file (${join(userdataDirectory, 'config.json5')}) is invalid!\n` +
    validation +
    `\n\nIf you're having too much trouble, just delete the file, and Nereid will restore it with default settings.`
  )
  dialog.showErrorBox(
    'The configuration file is invalid',
    `The file at ${join(userdataDirectory, 'config.json5')} is invalid:\n${validation}` +
    `\n\nTip: run Nereid from the console to better inspect the error.`
  )

  app.exit(11)
})()

export let config = {
  listeners: <((b: Configuration) => any)[]>[],
  get() {
    // so no other file can accidentaly modify config content
    return cloneObject(configContent)
  },
  set(obj: Partial<Configuration>) {
    Object.assign(configContent, obj);

    fs.writeFileSync(configPath, JSON5.stringify(configContent, { space: 2 }))

    config.listeners.forEach(fn => fn(configContent))
  },
  listen(fn: (c: Configuration) => void) {
    config.listeners.push(fn)
  },
  listenCall(fn: (c: Configuration) => void) {
    config.listeners.push(fn);
    fn(config.get())
  },
  unlisten(fn: (c: Configuration) => void) {
    let i: number = config.listeners.indexOf(fn);
    if (i == -1) return;

    config.listeners.splice(i, 1);
  }
}


export let lastlaunch = {
  listeners: [],
  get() {
    return cloneObject(lastlaunchContent)
  },
  set(obj: Partial<LastLaunch>) {
    Object.assign(lastlaunchContent, obj);

    fs.writeFileSync(lastlaunchPath, JSON.stringify(lastlaunchContent))

    this.listeners.forEach(fn => fn(lastlaunchContent))
  },
  listen(fn: (c: LastLaunch) => void) {
    this.listeners.push(fn)
  },
  listenCall(fn: (c: LastLaunch) => void) {
    this.listeners.push(fn);
    fn(this.get())
  },
  unlisten(fn: (c: LastLaunch) => void) {
    let i: number = this.listeners.indexOf(fn);
    if (i == -1) return;

    this.listeners.splice(i, 1);
  }
}


function filterEntries(array: History) {
  return array.filter($.uniqBy((e1, e2) => e1.tabUID == e2.tabUID && e1.sessionUUID == e2.sessionUUID && e1.url == e2.url))
}
let historyLock: Promise<void> | null = null
export let history = {
  getSync(): History {
    return JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
  },
  async get(): Promise<History> {
    return JSON.parse(await fs.promises.readFile(historyPath, 'utf-8'));
  },
  setSync(obj: History) {
    fs.writeFileSync(historyPath, JSON.stringify(filterEntries(obj)))
  },
  async set(obj: History) {
    if (historyLock) await historyLock;
    historyLock = fs.promises.writeFile(historyPath, JSON.stringify(filterEntries(obj)));

    await historyLock;
    historyLock = null;
  }
}


export let downloads = {
  async get(): Promise<Downloads> {
    if (await exists(downloadsPath)) {
      return JSON.parse(await fs.promises.readFile(downloadsPath, 'utf-8'))

    } else {
      await fs.promises.writeFile(downloadsPath, '[]')
      return []
    }
  },
  async set(data: Downloads) {
    return await fs.promises.writeFile(downloadsPath, JSON.stringify(data, null, app.isPackaged ? null : 2))
  }
}


export let bookmarks = {
  listeners: <((b: Bookmarks) => any)[]>[],
  async get(): Promise<Bookmarks> {
    return JSON.parse(await fs.promises.readFile(bookmarksPath, 'utf-8'))
  },
  async set(data: Bookmarks) {
    bookmarks.listeners.forEach(f => f(data))
    return await fs.promises.writeFile(bookmarksPath, JSON.stringify(data, null, app.isPackaged ? null : 2))
  },
  listen(fn: (b: Bookmarks) => any) {
    bookmarks.listeners.push(fn)
  },
  listenCall(fn: (b: Bookmarks) => any) {
    bookmarks.listeners.push(fn);
    bookmarks.get().then(fn)
  },
  unlisten(fn: (b: Bookmarks) => any) {
    let i: number = bookmarks.listeners.indexOf(fn);
    if (i == -1) return;

    bookmarks.listeners.splice(i, 1);
  }
}


if (global.isSafeMode) {
  for (const name in controlContent.options) {
    const option = controlContent.options[name];
    option.value = option.default;
  }
}

export let control = {
  ...controlContent,
  set(obj: Partial<Details>) {
    controlContent.arguments = obj.arguments || controlContent.arguments;
    controlContent.switches = obj.switches || controlContent.switches;
    controlContent.options = obj.options;
    // The variable `control` is not changing - it's a feature. You're supposed
    // to restart the browser after modifying the flags/switches or options.

    fs.writeFileSync(controlPath, JSON.stringify(controlContent, null, 2))
  },
  invalidateOptions(): never {
    fs.removeSync(controlPath);
    writeDefaults();
    control.set({
      arguments: controlContent.arguments,
      switches: controlContent.switches
    })

    dialog.showErrorBox(
      "There was a problem.", 
      "The options (nereid://control) are corrupted or invalid." +
      "They have been replaced with a working version, but Nereid needs to be restarted."
    );
    process.exit();
  },
  /** Needed for accessing even those settings, that aren't in effect yet */
  dynamicControl: controlContent
}
console.timeEnd('userData init');