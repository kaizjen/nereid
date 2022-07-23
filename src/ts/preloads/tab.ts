// Preload for tabs

import { contextBridge as ctx, ipcRenderer, webFrame } from 'electron';
import type { Bookmark } from '../types';

const expose = ctx.exposeInMainWorld

webFrame.setIsolatedWorldInfo(1, {
  name: "Nereid's shared extension context"
})

console.log('preload running', webFrame, webFrame == webFrame.top);

class NereidError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'NereidError'
  }
}

async function sendInternal(id: string, ...args: any[]) {
  let val = await ipcRenderer.invoke(`internal:${id}`, ...args);
  if (typeof val == 'object' && val.isError == true) {
    throw new NereidError(val.error);
  }
  return val;
}
function sendInternalSync(id: string, ...args: any[]) {
  return ipcRenderer.sendSync(`internal:${id}`, ...args)
}

let subscriptions = {
  config: false
}

if (location.protocol == 'nereid:') {
  expose('nereid', {
    i18n: {
      t: (...args) => ipcRenderer.sendSync('t', ...args),
      getSupportedLanguage: (locale: string) => sendInternalSync('getSupportedLanguage', locale),
      getAvailableTranslations: (locale: string) => sendInternalSync('getAvailableTranslations', locale)
    },
    clipboard: {
      readText: () => sendInternalSync('clipboard', 'readText'),
      writeText: (str: string) => sendInternalSync('clipboard', 'writeText', str),
    },
    userdata: {
      config: {
        get: () => sendInternal('userData', 'config'),
        set: (config: any) => sendInternal('userData', 'config:set', config),
        subscribe(fun: Function) {
          if (subscriptions.config) throw (new NereidError("Already subscribed"))

          sendInternal('userData', 'config:subscribe');
          subscriptions.config = true;

          let sub = (_e, newVal) => {
            fun(newVal)
          }
          ipcRenderer.on('subscription:config', sub)
        }
      },
      history: {
        get: ({ entries = 20, offset }) => sendInternal('userData', 'history', { entries, offset }),
        setAt: ({ index }, obj: any) => sendInternal('userData', 'history:setAt', { index }, obj),
        set: (obj: any) => sendInternal('userData', 'history:set', obj),
        delAt: (obj: any) => sendInternal('userData', 'history:delAt', obj),
        find: (finder: { type: 'text', text: string } | { type: 'date', date: number, compare: 'lt' | 'gt' | 'eq' }) => sendInternal('userData', 'history:find', finder),
      },
      downloads: {
        get: () => sendInternal('userData', 'downloads'),
        delete: (index: number) => sendInternal('userData', 'downloads:del', index),
        start: (index: number) => sendInternal('userData', 'downloads:start', index),
      },
      bookmarks: {
        getAllFolders: () => sendInternal('userData', 'bookmarks:getAllFolders'),
        getFolder: (obj: { folder: string }) => sendInternal('userData', 'bookmarks:getFolder', obj),
        setFolder: (obj: { folder: string, value: Bookmark[] }) => sendInternal('userData', 'bookmarks:setFolder', obj),
        delFolder: (obj: { folder: string }) => sendInternal('userData', 'bookmarks:delFolder', obj),
        addFolder: (obj: { folder: string }) => sendInternal('userData', 'bookmarks:addFolder', obj),
        renFolder: (obj: { folder: string, name: string }) => sendInternal('userData', 'bookmarks:renFolder', obj),
      }
    },
    interface: {
      getTheme: () => sendInternalSync('getTheme')
    },
    safeStorage: {
      isAvailable: () => sendInternal('safeStorage', 'check'),
      encrypt: (str, enc?) => sendInternal('safeStorage', 'en', str, enc),
      decrypt: (enStr, enc?) => sendInternal('safeStorage', 'de', enStr, enc),
    },
    dialog: {
      selectDirectory: (options) => sendInternal('dialog', 'dir', options)
    },
    shell: {
      showItemInFolder: (item) => sendInternal('shell', 'showItemInFolder', item),
      openPath: (path) => sendInternal('shell', 'openPath', path),
      beep: () => sendInternal('shell', 'beep'),
      readShortcutLink: (linkPath) => sendInternal('shell', 'readShortcutLink', linkPath)
    },
    session: {
      clearData: (clearObj) => sendInternal('session', 'clear', clearObj),
      getCertificate: (hostname: string) => sendInternal('session', 'getCertificate', hostname)
    },
    view: {
      requestFullWindowView: () => sendInternal('requestFullWindowView'),
      leaveFullWindowView: () => sendInternal('leaveFullWindowView')
    },
    app: {
      restart: () => sendInternal('restart'),
      quit: () => sendInternal('quit'),
      about: () => sendInternalSync('getAboutInfo')
    },
    tab: {
      close: () => sendInternal('closeMe'),
      create: (url) => sendInternal('createTab', url),
      go: (url) => sendInternal('navigateMe', url),
    }
  })
}

if (location.protocol == 'chrome-error:') {
  expose('PostMainMessage', (msg) => {
    ipcRenderer.send('chrome-error:' + msg)
  })
}

function isForeground() {
  return ipcRenderer.sendSync('tab:isForeground')
}

function requestMain(id: string, ...args: any[]) {
  return ipcRenderer.invoke(`tab:${id}`, ...args)
}
function requestMainSync(id: string, ...args: any[]) {
  return ipcRenderer.sendSync(`tab:${id}`, ...args)
}

webFrame.insertCSS(`
body {
  background: white;
  color: black;
}
@media (prefers-color-scheme: dark) {
  :root { color-scheme: dark }
}
@media (prefers-color-scheme: light) {
  :root { color-scheme: light }
`)

expose('[NEREID]', {
  extendNavigator: {
    requestPresence() {
      // this is just a test API, // TODO: remove it
      return ipcRenderer.sendSync('tab:requestPresence')
    },
    fuckYou() {
      ipcRenderer.sendSync('nope')
    }
  },
  extendWindow: {
    prompt(t, defaultValue) {
      return ipcRenderer.sendSync('tab:prompt', t, defaultValue)
    },
    alert(message) {
      return ipcRenderer.sendSync('tab:alert', message)
    },
    confirm(message) {
      return ipcRenderer.sendSync('tab:confirm', message)
    }
  }
})

webFrame.executeJavaScript(`(function() {
  let { extendNavigator, extendWindow } = window['[NEREID]'];
  
  for (let prop in extendNavigator) {
    window.navigator[prop] = extendNavigator[prop]
  }
  
  for (let prop in extendWindow) {
    window[prop] = extendWindow[prop]
  }
  
  delete window['[NEREID]']; // doesn't work anyway
}());`)