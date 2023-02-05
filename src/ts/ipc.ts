// Manages the recieving IPC

import { ipcMain, BrowserWindow, clipboard, nativeTheme, safeStorage, dialog, shell, session, app, Menu } from "electron";
import type { WebContents, IpcMainEvent } from "electron";
import fetch from "electron-fetch";
import * as userData from "./userdata";
import type { TabWindow, TabOptions, Configuration } from "./types"
import $ from "./vars";
import * as tabManager from './tabs'
import * as _url from "url";
import { appMenu, displayOptions, menuNewTab, menuOfBookmark, menuOfTab } from "./menu";
import { getTabWindowByID, setHeadHeight, isTabWindow, newDialogWindow, setCurrentTabBounds } from "./windows";
import type TypeFuse from "fuse.js";
import { certificateCache, DEFAULT_PARTITION, NO_CACHE_PARTITION, PRIVATE_PARTITION } from "./sessions";
import { getSupportedLanguage, t, availableTranslations } from "./i18n";
import { adBlockerError, isAdBlockerReady, webContentsABMap } from "./adblocker";
const Fuse = require('fuse.js') as typeof TypeFuse;
// must use require here because fuse.js, when require()d, doesnt have a .default property.

const URLParse = $.URLParse

let _historyLengthFeat = userData.control.options.max_history_for_hints
const maxHistoryHintLength = _historyLengthFeat?.type == 'num' ? _historyLengthFeat.value : 3000;

export function createDialog(wc: WebContents, type: string, arg: any): Promise<string | null | boolean> {
  return new Promise(resolve => {
    let win = BrowserWindow.fromWebContents(wc) as TabWindow;
    if (!win || !isTabWindow(win)) { resolve(null); return; }

    let { uniqueID: id } = win.tabs.find(tab => tab.webContents == wc);
    if (id == -1) { resolve(null); return; }

    function handleResponse(_e, channel: string, tabUID: number, response: string | null | boolean) {
      if (channel != 'dialog-response' || tabUID != id) return;

      resolve(response);
      win.chrome.webContents.off('ipc-message', handleResponse)
      win.chrome.webContents.send('dialog-close', id);
    }

    win.chrome.webContents.send('dialog-open', id, type, arg);
    win.chrome.webContents.on('ipc-message', handleResponse)
  })
}

export function init() {
  ipcMain.on('t', (e, str: string, other?: Record<string, any>) => {
    e.returnValue = t(str, other)
  })

  ipcMain.on('@window', (e, action) => {
    let win = BrowserWindow.fromWebContents(e.sender) as TabWindow;
    if (!win) return

    switch (action) {
      case 'min':
        win.minimize()
        win.once('restore', () => {
          // explanation at menu-mgr.ts, at the bottom of the only function there
          win.chrome.webContents.sendInputEvent({
            type: 'mouseMove',
            x: 0, y: 0
          })
        })
        break;
      case 'max':
        win.isMaximized() ? win.unmaximize() : win.maximize()
        break;
      case 'close':
        win.close();
        break;

      default:
        throw new Error("ipcManager.on[@window]: unknown action:" + action);
    }
  });
  ipcMain.on('@tab', (e, action, ...params) => {
    let win = BrowserWindow.fromWebContents(e.sender) as TabWindow;
    if (!win || !win.currentTab) return;

    let wc = win.currentTab.webContents;

    switch (action) {
      case 'back':
        wc.goBack();
        break;
      case 'fwd':
        wc.goForward()
        break;
      case 'refresh':
        wc.reload();
        break;
      case 'setZoom':
        wc.zoomFactor = params[0];
        win.chrome.webContents.send('zoomUpdate', wc.zoomFactor)
        break;
      case 'hardRefresh':
        wc.reloadIgnoringCache();

        break;
      case 'createDownload':
        wc.downloadURL(params[0])

        break;
      case 'go': {
        console.log('go', params);
        let q = params[0];

        function search() {
          let searchConfig = userData.config.get().search;
          let SE = searchConfig.available[searchConfig.selectedIndex]

          win.currentTab.lastNavigationReason = `searched:${q}`
          wc.loadURL(SE.searchURL.replaceAll('%s', encodeURIComponent(q)))
        }

        if ($.isValidURL(q) && !q.includes(' ')) {
          win.currentTab.lastNavigationReason = 'input-url'
          const parsed = URLParse(q);
          console.log((parsed));

          if (parsed.protocol) {
            if (!parsed.slashes) {
              if (isNaN(Number(parsed.pathname))) search();
              else {
                // the hostname was probably incorrectly assumed to be the protocol,
                // and whatever comes after the `:` is the port
                wc.loadURL('http://' + q)
              }
            } else wc.loadURL(q);
            
          } else wc.loadURL('http://' + q);

        } else search();

        break;
      }
      case 'search': {
        let q = params[0];
        let searchConfig = userData.config.get().search;
        let SE = searchConfig.available[searchConfig.selectedIndex]

        win.currentTab.lastNavigationReason = `searched:${q}` // the 'via' property in history
        wc.loadURL(SE.searchURL.replaceAll('%s', encodeURIComponent(q)))

        break;
      }
      case 'navigate-hint':
        win.currentTab.lastNavigationReason = 'input-url'
        // NO break!
      case 'navigate':
        wc.loadURL(params[0])
        break;

      case 'stop':
        wc.stop();
        break;

      case 'inputEvent': {
        // We're redirecting the mouse events so that even when chrome's BV is on top,
        // it doesn't seem as it's blocking anything
        const buttonMap = {
          0: 'left' as const,
          1: 'middle' as const,
          2: 'right' as const
        }
        const timesZoom = n => n * win.chrome.webContents.zoomFactor

        let [type, options] = params as [
          "mouseDown" | "mouseUp" | "mouseMove" | "mouseWheel",
          any
        ]

        wc.sendInputEvent(
          type == 'mouseWheel' ? {
            type,
            x: timesZoom(options.x),
            y: timesZoom(options.y) - win.chromeHeight,
            accelerationRatioX: options.accelX,
            accelerationRatioY: options.accelY,
            deltaX: options.deltaX,
            deltaY: options.deltaY,
          } :
          {
            type,
            button: buttonMap[(options as any).button],
            x: timesZoom(options.x),
            y: timesZoom(options.y) - win.chromeHeight,
            clickCount: 1
          }
        )
        break;
      }

      case 'find': {
        const value = params[0], options = params[1];

        wc.findInPage(value, {
          findNext: options.newSearch,
          forward: options.forward,
          matchCase: options.caseSensitive
        })
        break;
      }

      case 'stopFind': {
        wc.stopFindInPage(params[0] ? 'clearSelection' : 'keepSelection')
        break;
      }

      default:
        throw new Error("ipcManager.on[@tab]: unknown action: " + action);
    }
  })


  ipcMain.on('chrome:setHeight', (e, value: number) => {
    let win = BrowserWindow.fromWebContents(e.sender) as TabWindow;
    if (!win) return;

    win.chromeHeight = Math.round(value * win.chrome.webContents.zoomFactor);
    console.log('height being set to', win.chromeHeight);
    
    win.setSheetOffset(win.chromeHeight);

    setCurrentTabBounds(win)
  })
  ipcMain.on('chrome:headHeight', (e, value: number) => {
    let win = BrowserWindow.fromWebContents(e.sender) as TabWindow;
    if (!win) return;

    setHeadHeight(Math.round(value));
    console.log('head height being set to', Math.round(value));
  })
  ipcMain.on('chrome:setTop', (e, isTop: boolean) => {
    let win = BrowserWindow.fromWebContents(e.sender) as TabWindow;
    if (!win) return;

    console.log('settop', isTop);
    if (isTop) {
      win.setTopBrowserView(win.chrome)

    } else {
      win.setTopBrowserView(win.currentTab)
    }
  })
  ipcMain.on('chrome:browserMenu', (e, pos) => {
    let win = BrowserWindow.fromWebContents(e.sender) as TabWindow;
    if (!win) return;

    displayOptions(win, pos);
  })
  ipcMain.on('chrome:menu-of-tab', (e, tabID: number) => {
    let win = BrowserWindow.fromWebContents(e.sender) as TabWindow;
    if (!win) return;

    let tab = win.tabs[tabID];
    if (!tab) throw(new Error("ipcManager: no tab found in window"))

    menuOfTab(win, tab)
  })
  ipcMain.on('chrome:menu-newTab', (e) => {
    let win = BrowserWindow.fromWebContents(e.sender) as TabWindow;
    if (!win) return;

    menuNewTab(win)
  })
  ipcMain.on('chrome:menu-of-bookmark', (e, bookmark, index: number) => {
    let win = BrowserWindow.fromWebContents(e.sender) as TabWindow;
    if (!win) return;

    menuOfBookmark(win, bookmark, index)
  })
  ipcMain.on('chrome:moveTab', (e, tabUID: number, newIndex: number) => {
    let win = BrowserWindow.fromWebContents(e.sender) as TabWindow;
    if (!win) return;
    
    tabManager.moveTab(tabManager.getTabByUID(tabUID), {
      window: win, index: newIndex
    })
  })


  ipcMain.handle('getAppForProtocol', async(_e, url: string) => {
    if (process.platform == 'darwin' || process.platform == 'win32') {
      try {
        let { icon, name } = await app.getApplicationInfoForProtocol(url);
  
        return { name, icon: `data:image/png;base64,${icon.toPNG().toString('base64')}` }
        
      } catch (_) {
        return { name: "(unknown)", icon: null }
      }

    } else {
      return {
        icon: null,
        name: app.getApplicationNameForProtocol(url) || "(unknown)"
      }
    }
  })

  ipcMain.handle('getAdblockerInfo', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (!isTabWindow(win)) return;

    return webContentsABMap[win.currentTab?.webContents.id] || {};
  })
  ipcMain.handle('getAdblockerStatus', () => {
    return {
      isAdBlockerReady, adBlockerError
    }
  })

  ipcMain.on('newTab', (e, options: TabOptions = { url: $.newTabUrl }) => {
    let win = BrowserWindow.fromWebContents(e.sender) as TabWindow;
    if (!win) return;

    options.url ||= $.newTabUrl;
    tabManager.createTab(win, options);
  })
  ipcMain.on('selectTab', (e, id: number) => {
    let win = BrowserWindow.fromWebContents(e.sender) as TabWindow;
    if (!win) return;

    tabManager.selectTab(win, { id });
  })
  ipcMain.on('closeTab', async(e, id: number, keepAlive?: boolean) => {
    let win = BrowserWindow.fromWebContents(e.sender) as TabWindow;
    if (!win) return;

    let tab = win.tabs[id];
    if (!tab) return;

    tabManager.closeTab(win, { id, tab }, keepAlive);
  })
  ipcMain.on('setMutedTab', (e, tabID: number, isMuted: boolean) => {
    let win = BrowserWindow.fromWebContents(e.sender) as TabWindow;
    if (!win) return;

    tabManager.setMutedTab(win, win.tabs[tabID], isMuted)
  })

  ipcMain.handle('getPageImageURL', async(e, imageType: 'preview' | 'thumbnail' | 'favicon', tabUID: number) => {
    const tab = tabManager.getTabByUID(tabUID);
    if (!tab) return;

    if (imageType == 'favicon') return tab.faviconURL;

    const code = `document.querySelector('meta[property="og:image"]')?.getAttribute('content')`;
    const ogImage = await tab.webContents.mainFrame.executeJavaScript(code).catch(e => console.log('getPageImageURL failed:', e));
    if (ogImage) return ogImage;

    switch (imageType) {
      case 'preview': {
        const screenshot = await tab.webContents.capturePage();
        return 'data:image/png;base64,' + screenshot.toPNG().toString('base64')
      }
      case 'thumbnail': {
        return null;
      }
    
      default: return null
    }
  })

  ipcMain.on('getHints', async (e, query: string) => {
    // MAYBE: move getHints to another place?
    console.log('querying hints for %o', query);

    let win = BrowserWindow.fromWebContents(e.sender) as TabWindow;
    if (!win) return;

    let _searchTemp = userData.config.get().search;
    let hints: ({
      internal: 'url'
      title?: string
      url: string
    } | {
      internal: 'search'
      text: string
      type: string
    })[] = [];
    hints.push({
      internal: 'search',
      text: query,
      type: t('ui.hints.search', { engine: _searchTemp.available[_searchTemp.selectedIndex].name })
    })
    if ($.isValidURL(query)) {
      hints.push({
        url: URLParse(query).protocol ? query : ('http://' + query),
        internal: 'url'
      })
    }
    try {
      let history = await userData.history.get();

      if (history.length > maxHistoryHintLength) {
        history.length = maxHistoryHintLength;
      }

      let instance = new Fuse(history, {
        sortFn: (a, b) => a.score - b.score,
        ignoreLocation: true,
        keys: ['url', 'title'],
        threshold: 0.3
      })

      let matches = instance.search(query);

      let merged = matches
        .map(({ item }) => {
          if (item.reason.startsWith('searched:')) {
            return {
              internal: 'search' as const,
              text: item.reason.slice("searched:".length),
              type: t('ui.hints.prev-search', { site: URLParse(item.url).hostname })
            }
          }
          return {
            title: item.title,
            url: item.url,
            internal: 'url' as const
          }
        })
        .filter($.uniqBy((val1, val2) => val1.title == val2.title && val2.url == val2.url))
      ;

      if (merged.length > 5) {
        merged.length = 5
      }

      hints.push(...merged)

    } catch (e) {
      console.log('There was an error while trying to get history-based hints:', e);
    }
    block: try {
      let { privacy } = userData.config.get();
      if (!privacy.useSuggestions) break block;

      let searchEngine = _searchTemp.available[_searchTemp.selectedIndex]
      if (win.currentTab.private || query.startsWith('nereid:')) break block;

      let suggestAlgorithm: (res) => (Promise<string[]> | string[]) = $.searchHintAlgorithms[
        searchEngine.suggestAlgorithm == 'google-like' ? 'googleLike' :
          searchEngine.suggestAlgorithm == 'startpage-like' ? 'startpageLike' :
            searchEngine.suggestAlgorithm == 'extension' ? 'extension' :
              searchEngine.suggestAlgorithm == 'find' ? 'finder' :
                // if extension adds its own search engine with its own hinting alrorithm, use it instead.
                searchEngine.suggestAlgorithm
      ]

      const response = await fetch(
        searchEngine.suggestURL.replaceAll('%s', encodeURIComponent(query)),
        {
          session: session.fromPartition(privacy.hideSessionForSuggestions ? NO_CACHE_PARTITION : DEFAULT_PARTITION)
        }
      )

      let suggestions = (await suggestAlgorithm(response)).map(text => ({
        text, internal: 'search' as const, type: t('ui.hints.search', { engine: searchEngine.name })
      }))

      hints.push(...suggestions);

      if (hints.length > 12) {
        hints.length = 12
      }

    } catch (e) {
      console.log('There was an error while trying to get hints:', e);
    }
    win.chrome.webContents.send('gotHints', hints)
    //console.log('gotHints:: ', hints);
  })

  ipcMain.on('showCertificate', async (e, hostname: string) => {
    newDialogWindow({ type: 'certificate', init: hostname, options: {
      modal: true, parent: BrowserWindow.fromWebContents(e.sender)
    } })
  })
  ipcMain.on('showCookies', async (e, url: string) => {
    await newDialogWindow({ type: 'cookieviewer', init: url, options: {
      modal: true, parent: BrowserWindow.fromWebContents(e.sender)
    } })
  })

  ipcMain.handle('userData/downloads', async(_e, action, index) => {
    switch (action) {
      case 'get': {
        return await userData.downloads.get()
      }
      case 'del': {
        let dl = await userData.downloads.get();
        dl.splice(index, 1);
        await userData.downloads.set(dl)
        return true;
      }
      case 'start': {
        let dl = await userData.downloads.get();
        let { urlChain } = dl[index];
        getTabWindowByID(0).currentTab.webContents.downloadURL(urlChain.at(-1))
        return true;
      }
    }
  })

  function onTab(msg: string, fn: (e: Electron.IpcMainInvokeEvent, ...args: any[]) => any) {
    ipcMain.handle(`tab:${msg}`, async(...args) => {
      try {
        return await fn(...args)
      } catch (error) {
        return { isError: true, error: error.stack }
      }
    })
  }
  function onTabSync(msg: string, fn: (e: Electron.IpcMainEvent, ...args: any[]) => any) {
    ipcMain.on(`tab:${msg}`, (...args) => {
      try {
        return fn(...args)
      } catch (error) {
        return { isError: true, error: error.stack }
      }
    })
  }

  onTabSync('prompt', async (e, msg: string, defaultValue: string) => {
    e.returnValue = await createDialog(
      e.sender,
      'prompt',
      { msg, defaultValue }
    );
  })
  onTabSync('alert', async (e, msg: string) => {
    console.log('al:', await createDialog(
      e.sender,
      'alert',
      { msg }
    ))
    e.returnValue = undefined;
  })
  onTabSync('confirm', async (e, msg: string) => {
    e.returnValue = await createDialog(
      e.sender,
      'confirm',
      { msg }
    );
  })


  function onInternal(msg: string, fn: (e: Electron.IpcMainInvokeEvent, ...args: any[]) => any) {
    ipcMain.handle(`internal:${msg}`, async(...args) => {
      try {
        return await fn(...args)
      } catch (error) {
        return { isError: true, error: error.stack ?? error }
      }
    })
  }
  function onInternalSync(msg: string, fn: (e: Electron.IpcMainEvent, ...args: any[]) => any) {
    ipcMain.on(`internal:${msg}`, (...args) => {
      try {
        return fn(...args)
      } catch (error) {
        return { isError: true, error: error.stack ?? error }
      }
    })
  }
  
  onInternalSync('clipboard', (e, action, arg) => {
    try {
      e.returnValue = clipboard[action](arg)

    } catch (_err) {
      e.returnValue = { error: `Error: ${_err}` }
    }
  })
  onInternal('userData', async(e, action, obj, obj2) => {
    switch (action) {
      case 'config': {
        return userData.config.get()
      }
      case 'config:set': {
        return userData.config.set(obj)
      }
      case 'config:subscribe': {
        function sub(c: Configuration) {
          if (e.sender.isDestroyed()) {
            // had to resort to this terrible method because "destroyed" event doesn't fire (???)
            unsub();
            return;
          }
          e.sender.send('subscription:config', c)
        }
        function unsub() {
          userData.config.unlisten(sub)
        }
        userData.config.listen(sub);
        e.sender.once('did-navigate', unsub)
      }

      case 'lastlaunch': {
        return userData.lastlaunch.get()
      }
      case 'lastlaunch:set': {
        return userData.lastlaunch.set(obj)
      }

      case 'history': {
        // obj is { entries: number, offset: number }
        let history = await userData.history.get();
        if (obj.offset) {
          history = history.slice(obj.offset)
        }
        history.length = obj.entries;
        return history;
      }
      case 'history:set': {
        let history = obj;
        return await userData.history.set(history)
      }
      case 'history:setAt': {
        // obj is { index: number }
        let history = await userData.history.get();
        history[obj.index] = obj2;
        return await userData.history.set(history)
      }
      case 'history:delAt': {
        // obj is { index: number }
        let history = await userData.history.get();
        history.splice(obj.index, 1);
        return await userData.history.set(history)
      }
      case 'history:find': {
        // TODO: use Fuse for this
        let history = await userData.history.get();
        let i: number[];
        function occurrences(string: string, subString: string, allowOverlapping?: boolean) {
          // source: https://stackoverflow.com/a/7924240
          string += "";
          subString += "";
          if (subString.length <= 0) return (string.length + 1);

          var n = 0,
            pos = 0,
            step = allowOverlapping ? 1 : subString.length;

          while (true) {
            pos = string.indexOf(subString, pos);
            if (pos >= 0) {
              ++n;
              pos += step;
            } else break;
          }
          return n;
        }

        if (obj.type == 'text') {
          obj.text = obj.text.trim().toLowerCase();
          i = history.map((hi, i) => {
            let likability = 0;
            let title = decodeURI(hi.title).trim().toLowerCase()
            let url = decodeURI(hi.url).trim().toLowerCase()
            likability += (title.includes(obj.text) ? 1 : 0);
            likability += (url.includes(obj.text) || url.includes(obj.text.replaceAll(' ', '-')) || url.includes(obj.text.replaceAll(' ', '_')) ? 1 : 0);
            likability += (title.startsWith(obj.text) || title.endsWith(obj.text) ? 1 : 0);
            likability += (url.startsWith(obj.text) || url.endsWith(obj.text) ? 1 : 0);
            likability += occurrences(title, obj.text);

            return {i, likability};

          }).filter(l => l.likability > 3).sort((a, b) => b.likability - a.likability).map(x => x.i)
          
        } else {
          let findDate = obj.date;
          let c = obj.compare;
          i = history.filter(({ timestamp }) => {
            if (c == 'lt') {
              return timestamp < findDate;

            } else if(c == 'gt') {
              return timestamp > findDate;

            } else {
              let date1 = new Date(timestamp);
              let date2 = new Date(findDate);

              return date1.getDate() == date2.getDate() && 
                     date1.getMonth() == date2.getMonth() &&
                     date1.getFullYear() == date2.getFullYear();
            }

          }).map(el => history.indexOf(el))
        }
        return i;
      }

      case 'downloads': {
        return await userData.downloads.get()
      }
      case 'downloads:del': {
        let dl = await userData.downloads.get();
        dl.splice(obj, 1);
        await userData.downloads.set(dl)
        return true;
      }
      case 'downloads:start': {
        let dl = await userData.downloads.get();
        let { urlChain } = dl[obj];
        getTabWindowByID(0).currentTab.webContents.downloadURL(urlChain.at(-1))
        return true;
      }

      case 'bookmarks:getAllFolders': {
        let bookmarks = await userData.bookmarks.get();
        return Object.keys(bookmarks)
      }
      case 'bookmarks:getFolder': {
        let bookmarks = await userData.bookmarks.get();
        if (!(obj.folder in bookmarks)) throw `No such folder as "${obj.folder}"`;

        return bookmarks[obj.folder];
      }
      case 'bookmarks:addFolder': {
        let bookmarks = await userData.bookmarks.get();
        if (obj.folder in bookmarks) throw `Folder "${obj.folder}" already exists.`;

        bookmarks[obj.folder] = [];
        return await userData.bookmarks.set(bookmarks)
      }
      case 'bookmarks:delFolder': {
        let bookmarks = await userData.bookmarks.get();
        if (!(obj.folder in bookmarks)) throw `Folder "${obj.folder}" doesn't exist.`;

        delete bookmarks[obj.folder];
        return await userData.bookmarks.set(bookmarks)
      }
      case 'bookmarks:setFolder': {
        let bookmarks = await userData.bookmarks.get();
        if (!(obj.folder in bookmarks)) throw `Folder "${obj.folder}" doesn't exist.`;

        bookmarks[obj.folder] = obj.value;
        return await userData.bookmarks.set(bookmarks)
      }
      case 'bookmarks:renFolder': {
        let bookmarks = await userData.bookmarks.get();
        if (!(obj.folder in bookmarks)) throw `Folder "${obj.folder}" doesn't exist.`;
        if (obj.name in bookmarks) throw `Folder "${obj.folder}" already exists.`;

        bookmarks[obj.name] = bookmarks[obj.folder];
        delete bookmarks[obj.folder];
        return await userData.bookmarks.set(bookmarks)
      }

      case 'control:get': {
        return userData.control.dynamicControl;
      }
      case 'control:setOptions': {
        return userData.control.set({...userData.control.dynamicControl, options: obj });
      }
      case 'control:setSwitches': {
        return userData.control.set({...userData.control.dynamicControl, switches: obj });
      }
      case 'control:setArguments': {
        return userData.control.set({...userData.control.dynamicControl, arguments: obj });
      }

      default:
        throw new Error(`[userData] unknown command "${action}"`)
    }
  })
  onInternalSync('getTheme', (e) => {
    e.returnValue = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  })
  onInternal('safeStorage', (_e, action, str, enc) => {
    switch (action) {
      case 'check': {
        return safeStorage.isEncryptionAvailable()
      }
      case 'en': {
        return safeStorage.encryptString(str).toString(enc || 'base64')
      }
      case 'de': {
        return safeStorage.decryptString(Buffer.from(str as string, enc || 'base64'))
      }
    
      default:
        throw new Error(`[safeStorage] Unknown action: ${action}`)
    }
  })
  onInternal('dialog', async(e, action: string, options) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return;

    switch (action) {
      case 'dir': {
        return await dialog.showOpenDialog(win, {
          properties: [ 'openDirectory', 'createDirectory', ...(options.properties || []) ],
          title: options.title,
          message: options.message,
          buttonLabel: options.buttonLabel,
          filters: options.filters
        })
      }
    
      default:
        throw new Error(`[dialog] unknown action: ${action}`)
    }
  })
  onInternal('cookies', async(e, action: string, options) => {
    const modalWindow = BrowserWindow.fromWebContents(e.sender);
    const window = modalWindow.getParentWindow();
    if (!window || !isTabWindow(window)) return;

    const { cookies } = window.currentTab.private ? session.fromPartition(PRIVATE_PARTITION) : session.fromPartition(DEFAULT_PARTITION);
    switch (action) {
      case 'get': {
        return await cookies.get({
          url: options.url, domain: options.domain, name: options.name,
          path: options.path, secure: options.secure, session: options.session
        })
      }
      case 'remove': {
        return await cookies.remove(options.url, options.name)
      }
      case 'set': {
        return await cookies.set({
          url: options.url, domain: options.domain, name: options.name,
          path: options.path, secure: options.secure, value: options.value,
          sameSite: options.sameSite, httpOnly: options.httpOnly, expirationDate: options.expirationDate
        })
      }
    
      default: throw new Error(`[cookies] unknown action: ${action}`);
    }
  })

  onInternal('shell', (_e, action: string, arg: string) => {
    return shell[action](arg)
  })

  onInternal('session', async(_e, action: string, arg) => {
    const ses = session.fromPartition(DEFAULT_PARTITION);

    switch (action) {
      case 'clear': {
        const available = [
          'appcache', 'cookies', 'filesystem', 'indexdb',
          'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage'
        ]
        let storages = [];

        for (const type in arg) {
          const value = arg[type];
          if (value && available.includes(type)) {
            storages.push(type)
          }
        }

        console.log('Clearing items:', storages);
        
        return await ses.clearStorageData({
          storages
        })
      }
      case 'getCertificate': {
        if (arg in certificateCache) {
          return certificateCache[arg]

        } else throw(`No certificate of "${arg}" found.`)
      }
    
      default:
        throw new Error(`[session]: Unknown action: ${action}`);
    }
  })

  function preventEvent(e: Electron.Event) {
    e.preventDefault()
  }
  onInternal('requestFullWindowView', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender) as TabWindow
    if (!win || !isTabWindow(win)) return;

    if (win.currentTab.webContents != e.sender) {
      throw "Hidden tabs are not allowed to request full window view"
    }

    const { width, height } = win.getContentBounds()
    win.currentTab.setBounds({ x: 0, y: 0, width, height });

    win.isFullScreen = () => {
      // a hack around the 'setCurrentTabBounds' function
      // this is the easiest solution right now, maybe should be done more gracefully
      return true;
    }

    win.currentTab.webContents.on('will-navigate', preventEvent)
    // this is easier than to try to leave full window view when webContents navigate

    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {
        label: 'Nereid',
        submenu: [{
          role: 'quit'
        }]
      }
    ]))
  })
  onInternal('leaveFullWindowView', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender) as TabWindow
    if (!win || !isTabWindow(win)) return;

    win.isFullScreen = BrowserWindow.prototype.isFullScreen
    setCurrentTabBounds(win);
    win.currentTab.webContents.off('will-navigate', preventEvent)

    Menu.setApplicationMenu(appMenu)
  })
  onInternalSync('getSupportedLanguage', (e, locale) => {
    e.returnValue = getSupportedLanguage(locale)
  })
  onInternalSync('getAvailableTranslations', (e) => {
    e.returnValue = availableTranslations;
  })

  onInternal('restart', () => {
    app.relaunch();
    app.quit();
  })
  onInternal('quit', () => {
    app.quit();
  })
  onInternalSync('getAboutInfo', (e) => {
    e.returnValue = {
      paths: {
        userData: app.getPath('userData'),
        exe: app.getPath('exe'),
        appPath: app.getAppPath(),
        cache: app.getPath('sessionData')
      },
      name: app.getName(),
      versions: {
        nereid: app.getVersion(),
        ...process.versions
      }
    }
  })

  onInternal('getFileIcon', async(_e, path) => {
    let img = await app.getFileIcon(path, { size: 'normal' });

    return img.toPNG().toString('base64')
  })

  onInternal('closeMe', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender) as TabWindow
    if (!win || !isTabWindow(win)) return;

    let tab = win.tabs.find(t => t.webContents == e.sender);
    if (!tab) throw "No tab found in window"

    tabManager.closeTab(win, { tab })
  })
  onInternal('createTab', (e, url) => {
    const win = BrowserWindow.fromWebContents(e.sender) as TabWindow
    if (!win || !isTabWindow(win)) return;

    tabManager.createTab(win, { url })
  })
  onInternal('navigateMe', (e, url) => {
    const win = BrowserWindow.fromWebContents(e.sender) as TabWindow
    if (!win || !isTabWindow(win)) return;

    e.sender.loadURL(url)
  })
  onInternal('sendKeyToChrome', (e, { code, key, ctrlKey }) => {
    const win = BrowserWindow.fromWebContents(e.sender) as TabWindow
    if (!win || !isTabWindow(win)) return;

    win.chrome.webContents.focus();
    win.chrome.webContents.send('keySent', { code, key, ctrlKey })
  })
}

export function webContentsOnce(wc: WebContents, id: string, fn: Function) {
  function Recieve(e: IpcMainEvent, ...args: any[]) {
    if (e.sender == wc) {
      fn(e, ...args)
      ipcMain.off(id, Recieve)
    }
  }

  ipcMain.on(id, Recieve)
}

export function webContentsOn(wc: WebContents, id: string, fn: Function) {
  ipcMain.on(id, function (e: IpcMainEvent, ...args: any[]) {
    if (e.sender == wc) {
      fn(e, ...args)
    }
  })
}
