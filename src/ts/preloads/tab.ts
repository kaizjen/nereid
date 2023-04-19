// Preload for tabs

import { contextBridge as ctx, ipcRenderer, webFrame } from 'electron';
import type { Bookmark } from '../types';

const expose = ctx.exposeInMainWorld

webFrame.setIsolatedWorldInfo(1, {
  name: "Nereid's shared extension context"
})

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
        get: () => sendInternal('userData.config.get'),
        set: (config: any) => sendInternal('userData.config.set', config),
        subscribe(fun: Function) {
          if (subscriptions.config) throw (new NereidError("Already subscribed"))

          sendInternal('userData.config.subscribe');
          subscriptions.config = true;

          let sub = (_e, newVal) => {
            fun(newVal)
          }
          ipcRenderer.on('subscription:config', sub)
        }
      },
      history: {
        get: ({ entries = 20, offset }) => sendInternal('userData.history.get', { entries, offset }),
        setAt: ({ index }, obj: any) => sendInternal('userData.history.setAt', index, obj),
        set: (obj: any) => sendInternal('userData.history.set', obj),
        delAt: ({ index }) => sendInternal('userData.history.delAt', index),
        find: (finder: { type: 'text', text: string } | { type: 'date', date: number, compare: 'lt' | 'gt' | 'eq' }) => sendInternal('userData.history.find', finder),
      },
      downloads: {
        get: () => sendInternal('userData.downloads.get'),
        delete: (index: number) => sendInternal('userData.downloads.del', index),
        start: (index: number) => sendInternal('userData.downloads.start', index),
      },
      bookmarks: {
        getAllFolders: () => sendInternal('userData.bookmarks.getAllFolders'),
        getFolder: (obj: { folder: string }) => sendInternal('userData.bookmarks.getFolder', obj),
        setFolder: (obj: { folder: string, value: Bookmark[] }) => sendInternal('userData.bookmarks.setFolder', obj),
        delFolder: (obj: { folder: string }) => sendInternal('userData.bookmarks.delFolder', obj),
        addFolder: (obj: { folder: string }) => sendInternal('userData.bookmarks.addFolder', obj),
        renFolder: (obj: { folder: string, name: string }) => sendInternal('userData.bookmarks.renFolder', obj),
      },
      control: {
        get: () => sendInternal('userData.control.get'),
        setOptions: (obj: any) => sendInternal('userData.control.setOptions', obj),
        setSwitches: (obj) => sendInternal('userData.control.setSwitches', obj),
        setArguments: (obj) => sendInternal('userData.control.setArguments', obj),
      }
    },
    interface: {
      getTheme: () => sendInternalSync('getTheme')
    },
    safeStorage: {
      isAvailable: () => sendInternal('safeStorage.check'),
      encrypt: (str, enc?) => sendInternal('safeStorage.encrypt', str, enc),
      decrypt: (enStr, enc?) => sendInternal('safeStorage.decrypt', enStr, enc),
    },
    dialog: {
      selectDirectory: (options) => sendInternal('dialog.dir', options)
    },
    shell: {
      showItemInFolder: (item) => sendInternal('shell', 'showItemInFolder', item),
      openPath: (path) => sendInternal('shell', 'openPath', path),
      beep: () => sendInternal('shell', 'beep'),
      readShortcutLink: (linkPath) => sendInternal('shell', 'readShortcutLink', linkPath),
      getFileIcon: (path) => sendInternal('getFileIcon', path)
    },
    session: {
      clearData: (clearObj) => sendInternal('session.clear', clearObj),
      getCertificate: (hostname: string) => sendInternal('session.getCertificate', hostname)
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
      sendKeyToChrome: (keyData: object) => sendInternal('sendKeyToChrome', keyData)
    }
  })
}

if (location.protocol == 'chrome-error:') {
  expose('PostMainMessage', (msg) => {
    ipcRenderer.send('chrome-error:' + msg)
  })
}

function requestMain(id: string, ...args: any[]) {
  return ipcRenderer.invoke(`tab:${id}`, ...args)
}
function requestMainSync(id: string, ...args: any[]) {
  return ipcRenderer.sendSync(`tab:${id}`, ...args)
}

expose('[NEREID]', {
  extendNavigator: {
  },
  extendWindow: {
    close() {
      // This call can still be avoided with `window.open('/', '', 'popup').close.call(window)`,
      // which would close the tab.
      // TODO: find a way to patch every .call function somehow (possibly by modifying electron's code?)
      if (window.opener instanceof Window) {
        window.close();

      } else {
        console.warn("Scripts may close only the windows that were opened by them.")
      }
    },
    prompt(t, defaultValue) {
      return requestMainSync('prompt', t, defaultValue)
    },
    alert(message) {
      return requestMainSync('alert', message)
    },
    confirm(message) {
      return requestMainSync('confirm', message)
    }
  }
})

try {
  webFrame.executeJavaScript(`(function() {
    let { extendNavigator, extendWindow } = window['[NEREID]'];

    for (let prop in extendNavigator) {
      Object.defineProperty(navigator, prop, Object.getOwnPropertyDescriptor(extendNavigator, prop))
    }
    
    for (let prop in extendWindow) {
      Object.defineProperty(Window.prototype, prop, Object.getOwnPropertyDescriptor(extendWindow, prop))
      Object.defineProperty(window, prop, Object.getOwnPropertyDescriptor(extendWindow, prop))
    }
  }());`)
} catch (error) {
  // ignore
}