// This file is responsible for providing an interface of userData: configuration etc.

import * as fs from 'fs-extra'
import * as path from 'path'
import { app, dialog } from 'electron'
import type { Configuration, LastLaunch, History, Downloads, Details, Bookmarks } from './types'
import * as JSON5 from 'json5';
import $ from './common';
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
    const fileContents = fs.readFileSync(`${__dirname}/../browser/templates/lastlaunch.json`, 'utf-8');
    fs.writeFile(lastlaunchPath, fileContents)
    lastlaunchContent = JSON.parse(fileContents)
  }

  if (!existsSync(historyPath)) {
    fs.writeFileSync(historyPath, '[]')
  }

  if (!configContent) {
    const fileContents = fs.readFileSync(`${__dirname}/../browser/templates/config.json5`, 'utf-8');
    fs.writeFileSync(configPath, fileContents)
    configContent = JSON5.parse(fileContents)
  }

  if (!existsSync(downloadsPath)) {
    fs.writeFileSync(downloadsPath, '[]')
  }

  if (!existsSync(bookmarksPath)) {
    const fileContents = fs.readFileSync(`${__dirname}/../browser/templates/bookmarks.json`, 'utf-8');
    fs.writeFileSync(bookmarksPath, fileContents)
  }

  if (!controlContent) {
    const fileContents = fs.readFileSync(`${__dirname}/../browser/templates/control.json`, 'utf-8');
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

function uncompressObject(scheme: any[], data: any[]): any {
  const output = {};
  scheme.forEach((key, i) => {
    if (!(i in data)) return;

    if (Array.isArray(key)) {
      const stringKey = key[0];
      const type = key[1];
      const scheme = key[2];

      if (scheme) {
        if (type == 'obj') {
          // object
          output[stringKey] = uncompressObject(scheme, data[i])
        } else if (type == 'arr') {
          // array
          if (Array.isArray(scheme[0]) && scheme.length == 1) {
            // a hack to make it work on arrays of arrays
            const decArray = [];
            data[i].forEach((dat: any[]) => {
              decArray.push(uncompressArray(scheme[0], dat));
            })
            output[stringKey] = decArray

          } else {
            output[stringKey] = uncompressArray(scheme, data[i])
          }
        }

      } else {
        output[stringKey] = data[i]
      }

    } else {
      output[key] = data[i]
    }
  })
  return output;
}
function uncompressArray(scheme: any[], data: any[]) {
  const output = [];

  data.forEach(el => {
    output.push(uncompressObject(scheme, el))
  });

  return output;
}

function compressObject(object: any, recursive?: boolean) {
  const result = [];
  for (const key in object) {
    let el = object[key];
    if (typeof el == 'object' && el != null && recursive) {
      if (Array.isArray(el)) {
        el = compressArray(el, recursive);

      } else {
        el = compressObject(el, recursive);
      }
    }
    result.push(el);
  }
  return result;
}
function compressArray(array: any[], recursive?: boolean) {
  const final = [];
  array.forEach(item => {
    if (Array.isArray(item)) {
      final.push(compressArray(item, recursive))

    } else {
      final.push(compressObject(item, recursive));
    }
  });
  return final;
}



try {
  if (!fs.existsSync(userdataDirectory)) {
    fs.mkdirSync(userdataDirectory, { recursive: true })
    writeDefaults()
  }

  const bgImages = path.join(userdataDirectory, 'background_images')
  if (!fs.existsSync(bgImages)) {
    fs.copySync(
      `${__dirname}/../browser/templates/background_images`,
      bgImages,
      { recursive: true }
    )
  }

} catch (e) {
  dialog.showErrorBox("Unable to initialize user settings", e.toString())

  process.exit(1)
}

function uncompressLastLaunch(array: any[]) {
  return uncompressObject([
    'exitedSafely', 'launchFailed', [
      'windows', 'arr', [[
        'title', 'url', 'faviconURL'
      ]]
    ], [
      'bounds', 'obj', [
        'x', 'y', 'width', 'height', 'maximized'
      ]
    ]
  ], array)
}

try {
  configContent = JSON5.parse(fs.readFileSync(configPath, 'utf-8'))
  lastlaunchContent = uncompressLastLaunch(JSON.parse(fs.readFileSync(lastlaunchPath, 'utf-8')))
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
      backgroundImage: 'string',
      onlyShowCurrentTabGroup: 'boolean',
      showTabGroupColor: 'boolean'
    },
    search: {
      available: [[
        {
          name: 'string',
          searchURL: 'string',
          suggestURL: 'string',
          suggestAlgorithm: ['"google-like"', '"startpage-like"', '"find"'],
        }
      ]],
      selectedIndex: (value, betterTypeOf) => {
        if (betterTypeOf(value) != 'number') return "Value must be a number.";

        if (!configContent.search.available[value]) {
          return "Value outside of the `search.available` array range.";
        }
        return true;
      }
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
        fullscreen: bool_null,
      },
      sitePermissions: {
        '*': {
          '*': bool_null,
        }
      },
      adblockerEnabled: 'boolean',
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
      keyboardOpensTabNearby: 'boolean',
      downloadPath: ['string', null, undefined],
      spellChecker: {
        enabled: 'boolean',
        languages: [[ 'string' ]]
      },
      a11yEnabled: [ 'boolean', null ]
    },
    keybinds: {
      '*': 'string'
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

    fs.writeFileSync(lastlaunchPath, JSON.stringify(compressObject(lastlaunchContent, true)))

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


function compressHistory(array: History) {
  return compressArray(
    array.filter($.uniqBy((e1, e2) => e1.tabUID == e2.tabUID && e1.sessionUUID == e2.sessionUUID && e1.url == e2.url))
  )
}
function parseHistory(array: any[]) {
  return uncompressArray(['sessionUUID', 'tabUID', 'timestamp', 'reason', 'url', 'title', 'faviconURL'], array);
}
// These two variables lock the history so only one operation can be executed
// at a time. Whenever history is being written, `historyLock` becomes a `Promise`
// that resolves as soon as the write completes. If, in the time of resolving
// that promise, the set() function is called more than once, then only the most
// recent call goes through, thanks to the `currentSetCall` variable, others
// return `false`.
let historyLock: Promise<void> | null = null
let currentSetCall = -1;
export let history = {
  getSync(): History | false {
    try {
      return parseHistory(JSON.parse(fs.readFileSync(historyPath, 'utf-8')));

    } catch(error) {
      if (error.constructor == SyntaxError) return false;
      throw error;
    }
  },
  async get(): Promise<History | false> {
    if (historyLock) await historyLock;
    try {
      return parseHistory(JSON.parse(await fs.promises.readFile(historyPath, 'utf-8')));

    } catch (error) {
      if (error.constructor == SyntaxError) return false;
      throw error;
    }
  },
  setSync(obj: History) {
    fs.writeFileSync(historyPath, JSON.stringify(compressHistory(obj)))
  },
  /**
   * Returns `false` if the operation was rejected by a more recent history write.
   *
   * Returns `true` if the opertation was successful
   */
  async set(obj: History) {
    currentSetCall++;
    const thisSetCall = currentSetCall;

    if (historyLock) {
      console.log(`History write #${thisSetCall} is waiting for the history lock...`);
      await historyLock;
    }
    if (thisSetCall != currentSetCall) {
      // priotitize the most recent set() call
      console.warn(`History write #${thisSetCall} was rejected because a more recent write (#${currentSetCall}) is pending.`);
      return false;
    }

    historyLock = fs.promises.writeFile(historyPath, JSON.stringify(compressHistory(obj)));

    await historyLock;
    historyLock = null;
    return true;
  }
}

function parseDownloads(array: any[]) {
  return uncompressArray(['url', 'urlChain', 'savePath', 'status', 'offset', 'length'], array);
}
export let downloads = {
  async get(): Promise<Downloads> {
    if (await exists(downloadsPath)) {
      return parseDownloads(JSON.parse(await fs.promises.readFile(downloadsPath, 'utf-8')))

    } else {
      await fs.promises.writeFile(downloadsPath, '[]')
      return []
    }
  },
  async set(data: Downloads) {
    return await fs.promises.writeFile(downloadsPath, JSON.stringify(compressArray(data), null, app.isPackaged ? null : 2))
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
      "They have been replaced with a working version, but Nereid has to restart."
    );
    process.exit();
  },
  /** Needed for accessing the settings that aren't in effect yet */
  dynamicControl: controlContent
}
console.timeEnd('userData init');