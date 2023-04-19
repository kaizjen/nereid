// Manages the recieving IPC

import { ipcMain, BrowserWindow, clipboard, nativeTheme, safeStorage, dialog, shell, session, app, Menu, nativeImage } from "electron";
import type { WebContents, IpcMainEvent } from "electron";
import fetch from "electron-fetch";
import * as userData from "./userdata";
import type { TabWindow, TabOptions, Configuration, RealTab } from "./types"
import $ from "./common";
import * as tabManager from './tabs'
import * as _url from "url";
import { appMenu, displayOptions, menuNewTab, menuOfAddressBar, menuOfBookmark, menuOfPaneDivider, menuOfProcess, menuOfTab } from "./menu";
import { getTabWindowByID, setHeadHeight, isTabWindow, newDialogWindow, setCurrentTabBounds, getAllTabWindows, getIDOfTabWindow, PANE_SEP_WIDTH, newWindow } from "./windows";
import type TypeFuse from "fuse.js";
import { certificateCache, DEFAULT_PARTITION, NO_CACHE_PARTITION, PRIVATE_PARTITION } from "./sessions";
import { getSupportedLanguage, t, availableTranslations } from "./i18n";
import { adBlockerError, isAdBlockerReady, webContentsABMap } from "./adblocker";
import { kill } from "./process";
import { addTabToGroup, createTabGroup, getTabGroupByID, getTabsFromTabGroup, ungroup } from "./tabgroups";
// must use require here because these libraries, when require()d, don't have a .default property.
const Fuse = require('fuse.js') as typeof TypeFuse;

const URLParse = $.URLParse

let _historyLengthFeat = userData.control.options.max_history_for_hints
const maxHistoryHintLength = _historyLengthFeat?.type == 'num' ? _historyLengthFeat.value : 3000;

export function createDialog(wc: WebContents, type: string, arg: any): Promise<string | null | boolean> {
  return new Promise(resolve => {
    let win = BrowserWindow.fromWebContents(wc) as TabWindow;
    if (!win || !isTabWindow(win)) { resolve(null); return; }

    let { uniqueID: id } = win.tabs.find(tab => (tab as RealTab).webContents == wc);
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

  function onWindow(channel: string, handler: (win: TabWindow, e: Electron.IpcMainEvent, ...args: any[]) => any) {
    ipcMain.on(channel, (e, ...args: any[]) => {
      let win = BrowserWindow.fromWebContents(e.sender);
      if (!isTabWindow(win)) return;

      handler(win, e, ...args)
    })
  }
  onWindow('window.min', (win) => {
    win.minimize()
    win.once('restore', () => {
      // explanation at menu.ts, on('menu-will-close')
      win.chrome.webContents.sendInputEvent({
        type: 'mouseMove',
        x: 0, y: 0
      })
    })
  })
  onWindow('window.max', (win) => {
    win.isMaximized() ? win.unmaximize() : win.maximize();
  })
  onWindow('window.close', (win) => {
    win.close();
  })
  onWindow('window.resetDragRegions', (win) => {
    // By resetting the zoomFactor, the drag regions are recalculated properly.

    win.chrome.webContents.zoomFactor++;
    win.chrome.webContents.zoomFactor--;
  })

  function onCurrentTab(channel: string, handler: (wc: WebContents, win: TabWindow, e: Electron.IpcMainEvent, ...args: any[]) => any) {
    onWindow(channel, (win, e, ...args) => {
      if (!win.currentTab) return;
      let wc = win.currentTab.webContents;
      handler(wc, win, e, ...args)
    })
  }
  onCurrentTab('currentTab.back', (wc) => {
    wc.goBack();
  })
  onCurrentTab('currentTab.forward', (wc) => {
    wc.goForward();
  })
  onCurrentTab('currentTab.refresh', (wc) => {
    wc.reload();
  })
  onCurrentTab('currentTab.hardRefresh', (wc) => {
    wc.reloadIgnoringCache();
  })
  onCurrentTab('currentTab.setZoom', (wc, win, _e, zoom) => {
    wc.zoomFactor = zoom;
    win.chrome.webContents.send('zoomUpdate', wc.zoomFactor)
  })
  onCurrentTab('currentTab.go', (wc, win, _e, q) => {
    console.log('go', q);

    function search() {
      let searchConfig = userData.config.get().search;
      let SE = searchConfig.available[searchConfig.selectedIndex]

      win.currentTab.lastNavigationReason = `searched:${q}`
      wc.loadURL(SE.searchURL.replaceAll('%s', encodeURIComponent(q)))
    }

    function loadURLWithHTTP() {
      wc.loadURL('http://' + q)
    }

    if ($.isValidURL(q)) {
      win.currentTab.lastNavigationReason = 'input-url'
      const parsed = URLParse(q);

      if (parsed.protocol) {
        if (!parsed.slashes) {
          if (isNaN(Number(parsed.pathname))) search();
          else {
            // the hostname was probably incorrectly assumed to be the protocol,
            // and whatever comes after the `:` is the port
            loadURLWithHTTP()
          }
        } else wc.loadURL(q);

      } else loadURLWithHTTP();

    } else search();
  })
  onCurrentTab('currentTab.search', (wc, win, _e, q) => {
    let searchConfig = userData.config.get().search;
    let SE = searchConfig.available[searchConfig.selectedIndex]

    win.currentTab.lastNavigationReason = `searched:${q}` // the 'via' property in history
    wc.loadURL(SE.searchURL.replaceAll('%s', encodeURIComponent(q)))
  })
  onCurrentTab('currentTab.navigate', (wc, win, _e, url, isInputURL) => {
    if (isInputURL) win.currentTab.lastNavigationReason = 'input-url'
    wc.loadURL(url);
  })
  onCurrentTab('currentTab.stop', (wc) => {
    wc.stop();
  })
  onCurrentTab('currentTab.inputEvent', (wc, win, _e, type: "mouseDown" | "mouseUp" | "mouseMove" | "mouseWheel", options: any) => {
    // We're redirecting the mouse events so that even when chrome's BV is on top,
    // it doesn't seem as it's blocking anything
    const buttonMap = {
      0: 'left' as const,
      1: 'middle' as const,
      2: 'right' as const
    }
    const timesZoom = n => n * win.chrome.webContents.zoomFactor

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
  })
  onCurrentTab('currentTab.find', (wc, _w, _e, value, options) => {
    wc.findInPage(value, {
      findNext: options.newSearch,
      forward: options.forward,
      matchCase: options.caseSensitive
    })
  })
  onCurrentTab('currentTab.stopFind', (wc, _w, _e, clearSelection) => {
    wc.stopFindInPage(clearSelection ? 'clearSelection' : 'keepSelection')
  })


  onCurrentTab('createDownload', (wc, _w, _e, url) => {
    wc.downloadURL(url)
  })
  onWindow('chrome.setHeight', (win, _e, value: number) => {
    win.chromeHeight = Math.round(value * win.chrome.webContents.zoomFactor);
    console.log('height being set to', win.chromeHeight);
    
    win.setSheetOffset(win.chromeHeight);

    setCurrentTabBounds(win)
  })
  onWindow('chrome.headHeight', (win, _e, value: number) => {
    setHeadHeight(Math.round(value));
    console.log('head height being set to', Math.round(value));
  })
  onWindow('chrome.setTop', (win, _e, isTop: boolean) => {
    console.log('settop', isTop);
    if (isTop) {
      win.setTopBrowserView(win.chrome)

    } else {
      if (win.currentPaneView) {
        // First get the not current pane on top, then get the current tab on top
        // to ensure that the chrome remains at the bottom.
        if (win.currentTab == win.currentPaneView.leftTab) {
          win.setTopBrowserView(tabManager.asRealTab(win.currentPaneView.rightTab))

        } else {
          win.setTopBrowserView(tabManager.asRealTab(win.currentPaneView.leftTab))
        }
      }
      win.setTopBrowserView(win.currentTab)
    }
  })
  onWindow('chrome.movePanes', (win, _e, x: number) => {
    if (!win.currentPaneView) return console.warn("Tried to move panes without a pane view.");

    const leftTab = tabManager.asRealTab(win.currentPaneView.leftTab)
    const rightTab = tabManager.asRealTab(win.currentPaneView.rightTab)

    const fullFrame = win.currentPaneView.separatorPosition + leftTab.getBounds().width + rightTab.getBounds().width;
    const position = (x - (PANE_SEP_WIDTH)) / fullFrame;

    if (position > 1 || position < 0) throw("Invalid position.")
    if (position < 0.2 || position > 0.8) return;

    win.currentPaneView.separatorPosition = position;
    setCurrentTabBounds(win);

  })
  onWindow('chrome.browserMenu', (win, _e, pos) => {
    displayOptions(win, pos);
  })
  onWindow('chrome.menuOfTab', (win, _e, tabIndex: number) => {
    let tab = win.tabs[tabIndex];
    if (!tab) throw(new Error("ipcManager: no tab found in window"))

    menuOfTab(win, tab)
  })
  onWindow('chrome.menuNewTab', (win) => {
    menuNewTab(win)
  })
  onWindow('chrome.menuGroupNewTab', (win, _e, groupID: number) => {
    menuNewTab(win, getTabGroupByID(groupID).group)
  })
  onWindow('chrome.menuOfBookmark', (win, _e, bookmark, index: number) => {
    menuOfBookmark(win, bookmark, index)
  })
  onWindow('chrome.menuOfPaneDivider', (win) => {
    menuOfPaneDivider(win)
  })
  onWindow('chrome.menuOfAddressBar', (win, _e, options: { selectionText: string }) => {
    menuOfAddressBar(win, options)
  })

  onWindow('chrome.moveTab', (win, _e, tabUID: number, newIndex: number, shouldSelect: boolean) => {
    tabManager.moveTab(tabManager.getTabByUID(tabUID), {
      window: win, index: newIndex
    }, { shouldSelect })
  })
  onWindow('chrome.addTabToGroup', (win, _e, tabUID: number, gid: number) => {
    addTabToGroup(win, getTabGroupByID(gid).group, tabManager.getTabByUID(tabUID))
  })

  ipcMain.on('chrome.changeGroupData', (_e, gid, data) => {
    const desc = getTabGroupByID(gid);

    if (data.id) dialog.showErrorBox("", "Tab Group ID cannot be changed")
    Object.assign(desc.group, data)
    desc.window.chrome.webContents.send('tabGroupUpdate', desc.group)
  })
  ipcMain.on('chrome.ungroup', (_e, gid) => {
    const desc = getTabGroupByID(gid);

    ungroup(desc.window, desc.group);
  })
  ipcMain.on('chrome.moveGroupToNewWindow', async(_e, gid) => {
    const desc = getTabGroupByID(gid);
    const tabs = getTabsFromTabGroup(desc.window, desc.group)

    const oldStartIndex = desc.group.startIndex;
    const oldEndIndex = desc.group.endIndex;

    if (tabs.length == desc.window.tabs.length) {
      return console.warn("The only tab group in a window can't be moved to another window")
    }

    const newWin = await newWindow([]);

    tabs.forEach((tab, index) => {
      tabManager.moveTab(tab, { window: newWin, index })
    })
    createTabGroup(newWin, {
      name: desc.group.name,
      color: desc.group.color,
      startIndex: 0,
      endIndex: oldEndIndex - oldStartIndex
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
  ipcMain.on('selectTab', (e, index: number) => {
    let win = BrowserWindow.fromWebContents(e.sender) as TabWindow;
    if (!win) return;

    tabManager.selectTab(win, { index });
  })
  ipcMain.on('closeTab', async(e, index: number, keepAlive?: boolean) => {
    let win = BrowserWindow.fromWebContents(e.sender) as TabWindow;
    if (!win) return;

    let tab = win.tabs[index];
    if (!tab) return;

    tabManager.closeTab(win, { index, tab }, keepAlive);
  })
  ipcMain.on('setMutedTab', (e, tabIndex: number, isMuted: boolean) => {
    let win = BrowserWindow.fromWebContents(e.sender) as TabWindow;
    if (!win) return;

    tabManager.setMutedTab(win, win.tabs[tabIndex], isMuted)
  })

  onWindow('openUniqueNereidTab', (win, _e, page, nextToCurrentTab, path) => {
    tabManager.openUniqueNereidTab(win, page, nextToCurrentTab, path)
  })

  ipcMain.handle('getPageImageURL', async(e, imageType: 'preview' | 'thumbnail' | 'favicon', tabUID: number) => {
    const tab = tabManager.getTabByUID(tabUID);
    if (!tab || tab.isGhost) return;

    if (imageType == 'favicon') return tab.faviconURL;

    const code = `document.querySelector('meta[property="og:image"]')?.getAttribute('content')`;
    const ogImage = await tabManager.asRealTab(tab).webContents.mainFrame.executeJavaScript(code).catch(e => console.log('getPageImageURL failed:', e));
    if (ogImage) return ogImage;

    switch (imageType) {
      case 'preview': {
        const screenshot = await tabManager.asRealTab(tab).webContents.capturePage();
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
              searchEngine.suggestAlgorithm == 'find' ? 'finder' :
                'error'
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

  ipcMain.handle('getProcesses', () => {
    function $t(str: string, obj?: {}) {
      return t('windows.taskManager.processes.' + str, obj)
    }
    const PIDMap: Record<number, string> = {};
    const chromeProcesses: number[] = [];
    
    getAllTabWindows().forEach(tWin => {
      PIDMap[tWin.chrome.webContents.getOSProcessId()] = $t('windowUI', { id: getIDOfTabWindow(tWin) });
      chromeProcesses.push(tWin.chrome.webContents.getOSProcessId());

      const dtWC = tWin.chrome.webContents.devToolsWebContents;
      if (dtWC) {
        PIDMap[dtWC.getOSProcessId()] = $t('windowDevTools', { id: getIDOfTabWindow(tWin) })
      }

      tWin.tabs.forEach(tab => {
        if (tab.isGhost) return;
        const wc = tabManager.asRealTab(tab).webContents;
        PIDMap[wc.getOSProcessId()] = $t('tab', { title: wc.getTitle() });

        const dtWC = wc.devToolsWebContents;
        if (dtWC) {
          PIDMap[dtWC.getOSProcessId()] = $t('devTools', { tabTitle: wc.getTitle() })
        }
      })
    });

    BrowserWindow.getAllWindows().forEach(win => {
      if (isTabWindow(win)) return;
      PIDMap[win.webContents.getOSProcessId()] = $t('helperWindowUI', { title: win.getTitle() })
    })

    const metrics = app.getAppMetrics();
    for (const process of metrics) {
      if (PIDMap[process.pid]) {
        process.name = PIDMap[process.pid];
        if (chromeProcesses.includes(process.pid)) {
          process.serviceName = '$chrome'
        }
        continue;
      }

      switch (process.type) {
        case 'Browser': {
          process.name = $t('browser');
          break;
        }
        case 'GPU': {
          process.name = $t('gpu');
          break;
        }
        case 'Utility': {
          if (process.name) break;
          process.name = $t('utility', { name: process.serviceName });
          break;
        }
        case 'Tab': {
          process.name = $t('unknownTab');
          break;
        }
      
        default: {
          process.name = process.type;
        }
      }
    }
    return metrics;
  })

  ipcMain.handle('killProcess', (_e, pid: number) => {
    return kill(pid);
  })
  ipcMain.on('menuOfProcess', (_e, process) => {
    menuOfProcess(process)
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
  onInternal('userData.config.get', () => {
    return userData.config.get()
  })
  onInternal('userData.config.set', (_, obj) => {
    return userData.config.set(obj)
  })
  onInternal('userData.config.subscribe', (e) => {
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
  })

  onInternal('userData.lastlaunch.get', () => {
    return userData.lastlaunch.get()
  })
  onInternal('userData.lastlaunch.set', (_, obj) => {
    return userData.lastlaunch.set(obj)
  })

  onInternal('userData.history.get', async (_, obj: { offset: number, entries: number }) => {
    let history = await userData.history.get();
    if (obj.offset) {
      history = history.slice(obj.offset)
    }
    history.length = obj.entries;
    return history;
  })
  onInternal('userData.history.set', async (_, obj) => {
    let history = obj;
    return await userData.history.set(history)
  })
  onInternal('userData.history.setAt', async (_, index: number, obj) => {
    let history = await userData.history.get();
    history[index] = obj;
    return await userData.history.set(history)
  })
  onInternal('userData.history.delAt', async (_, index: number) => {
    let history = await userData.history.get();
    history.splice(index, 1);
    return await userData.history.set(history)
  })
  onInternal('userData.history.find', async (_, query: { type: 'text', text: string } | { type: 'date', date: number, compare: 'lt' | 'gt' | 'eq' }) => {
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

    if (query.type == 'text') {
      query.text = query.text.trim().toLowerCase();
      i = history.map((hi, i) => {
        let likability = 0;
        let title = decodeURI(hi.title).trim().toLowerCase()
        let url = decodeURI(hi.url).trim().toLowerCase()
        likability += (title.includes(query.text) ? 1 : 0);
        likability += (url.includes(query.text) || url.includes(query.text.replaceAll(' ', '-')) || url.includes(query.text.replaceAll(' ', '_')) ? 1 : 0);
        likability += (title.startsWith(query.text) || title.endsWith(query.text) ? 1 : 0);
        likability += (url.startsWith(query.text) || url.endsWith(query.text) ? 1 : 0);
        likability += occurrences(title, query.text);

        return { i, likability };

      }).filter(l => l.likability > 3).sort((a, b) => b.likability - a.likability).map(x => x.i)

    } else {
      let findDate = query.date;
      let c = query.compare;
      i = history.filter(({ timestamp }) => {
        if (c == 'lt') {
          return timestamp < findDate;

        } else if (c == 'gt') {
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
  })

  onInternal('userData.downloads.get', async () => {
    return await userData.downloads.get()
  })
  onInternal('userData.downloads.del', async (_, index) => {
    let dl = await userData.downloads.get();
    dl.splice(index, 1);
    await userData.downloads.set(dl)
    return true;
  })
  onInternal('userData.downloads.start', async (_, index) => {
    let dl = await userData.downloads.get();
    let { urlChain } = dl[index];
    getTabWindowByID(0).currentTab.webContents.downloadURL(urlChain.at(-1))
    return true;
  })

  onInternal('userData.bookmarks.getAllFolders', async () => {
    let bookmarks = await userData.bookmarks.get();
    return Object.keys(bookmarks)
  })
  onInternal('userData.bookmarks.getFolder', async (_, { folder }) => {
    let bookmarks = await userData.bookmarks.get();
    if (!(folder in bookmarks)) throw `No such folder as "${folder}"`;

    return bookmarks[folder];
  })
  onInternal('userData.bookmarks.addFolder', async (_, { folder }) => {
    let bookmarks = await userData.bookmarks.get();
    if (folder in bookmarks) throw `Folder "${folder}" already exists.`;

    bookmarks[folder] = [];
    return await userData.bookmarks.set(bookmarks)
  })
  onInternal('userData.bookmarks.delFolder', async (_, { folder }) => {
    let bookmarks = await userData.bookmarks.get();
    if (!(folder in bookmarks)) throw `Folder "${folder}" doesn't exist.`;

    delete bookmarks[folder];
    return await userData.bookmarks.set(bookmarks)
  })
  onInternal('userData.bookmarks.setFolder', async (_, { folder, value }) => {
    let bookmarks = await userData.bookmarks.get();
    if (!(folder in bookmarks)) throw `Folder "${folder}" doesn't exist.`;

    bookmarks[folder] = value;
    return await userData.bookmarks.set(bookmarks)
  })
  onInternal('userData.bookmarks.renFolder', async (_, { folder, name }) => {
    let bookmarks = await userData.bookmarks.get();
    if (!(folder in bookmarks)) throw `Folder "${folder}" doesn't exist.`;
    if (name in bookmarks) throw `Folder "${folder}" already exists.`;

    bookmarks[name] = bookmarks[folder];
    delete bookmarks[folder];
    return await userData.bookmarks.set(bookmarks)
  })

  onInternal('userData.control.get', () => {
    return userData.control.dynamicControl;
  })
  onInternal('userData.control.setOptions', (_, obj) => {
    return userData.control.set({ ...userData.control.dynamicControl, options: obj });
  })
  onInternal('userData.control.setSwitches', (_, obj) => {
    return userData.control.set({ ...userData.control.dynamicControl, switches: obj });
  })
  onInternal('userData.control.setArguments', (_, obj) => {
    return userData.control.set({ ...userData.control.dynamicControl, arguments: obj });
  })

  onInternalSync('getTheme', (e) => {
    e.returnValue = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  })

  onInternal('safeStorage.check', (_e) => {
    return safeStorage.isEncryptionAvailable()
  })
  onInternal('safeStorage.encrypt', (_e, str, enc) => {
    return safeStorage.encryptString(str).toString(enc || 'base64')
  })
  onInternal('safeStorage.decrypt', (_e, str: string, enc) => {
    return safeStorage.decryptString(Buffer.from(str, enc || 'base64'))
  })

  onInternal('dialog.dir', async(e, options) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return;
    return await dialog.showOpenDialog(win, {
      properties: [ 'openDirectory', 'createDirectory', ...(options.properties || []) ],
      title: options.title,
      message: options.message,
      buttonLabel: options.buttonLabel,
      filters: options.filters
    })
  })
  function onCookies(channel: string, handler: (e: Electron.IpcMainInvokeEvent, cookies: Electron.Cookies, options: any) => any) {
    onInternal('cookies.' + channel, (e, options) => {
      const modalWindow = BrowserWindow.fromWebContents(e.sender);
      const window = modalWindow.getParentWindow();
      if (!window || !isTabWindow(window)) return;

      const { cookies } = window.currentTab.private ? session.fromPartition(PRIVATE_PARTITION) : session.fromPartition(DEFAULT_PARTITION);
      return handler(e, cookies, options)
    })
  }
  onCookies('get', async (_, cookies, options) => {
    return await cookies.get({
      url: options.url, domain: options.domain, name: options.name,
      path: options.path, secure: options.secure, session: options.session
    })
  })
  onCookies('set', async (_, cookies, options) => {
    return await cookies.set({
      url: options.url, domain: options.domain, name: options.name,
      path: options.path, secure: options.secure, value: options.value,
      sameSite: options.sameSite, httpOnly: options.httpOnly, expirationDate: options.expirationDate
    })
  })
  onCookies('remove', async (_, cookies, options) => {
    return await cookies.remove(options.url, options.name)
  })

  onInternal('shell', (_e, action: string, arg: string) => {
    return shell[action](arg)
  })

  onInternal('session.clear', async (_e, types) => {
    const ses = session.fromPartition(DEFAULT_PARTITION);
    const available = [
      'appcache', 'cookies', 'filesystem', 'indexdb',
      'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage'
    ]
    let storages = [];

    for (const type in types) {
      const value = types[type];
      if (value && available.includes(type)) {
        storages.push(type)
      }
    }

    console.log('Clearing items:', storages);

    return await ses.clearStorageData({
      storages
    })
  })
  onInternal('session.getCertificate', async (_e, hostname) => {
    if (hostname in certificateCache) {
      return certificateCache[hostname]

    } else throw (`No certificate of "${hostname}" found.`)
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

    let tab = win.tabs.find(t => (t as RealTab).webContents == e.sender);
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
