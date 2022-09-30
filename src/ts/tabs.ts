// Tabs' creation, removal and whatever else

import type { TabWindow, TabOptions, Tab } from "./types";
import { BrowserView, BrowserWindow, dialog, nativeTheme, session, WebContents } from "electron";
import fetch from "electron-fetch";
import * as userData from './userdata'
import { DEFAULT_PARTITION, NO_CACHE_PARTITION, PRIVATE_PARTITION, validateDomainByURL } from './sessions'
import { handleNetError } from './net-error-analyzer'
import $ from './vars'
import { showContextMenu } from "./menu";
import { getAllTabWindows, newWindow, setCurrentTabBounds } from "./windows";
import { t } from "./i18n";

const { URLParse } = $

// Global unique identifiers of all tabs.
const tabUniqueIDs: { [uniqueID: number]: Tab | null } = {} // not an array because we don't really need its cool methods
let UIDsAmount = 0;

const options = userData.control.options;

const shouldCrashClosedTabs = options.crash_tabs_on_close?.value
const shouldUseExperimentalBeforeUnload = options.experimental_beforeunload?.value
const autoplayWithDocumentActivation = options.autoplay_by_document_activation?.value

const delayExecution = (function() {
  let allExecutions: Function[] = [];
  let currentTimeout: NodeJS.Timeout;

  return function delayExecution(fn: Function, ms: number = 100) {
    clearTimeout(currentTimeout)
    allExecutions.push(fn)
    currentTimeout = setTimeout(() => {
      allExecutions.forEach(f => f())
      allExecutions = [];
    }, ms)
  }
})()


export function getTabByUID(uid: number) {
  return tabUniqueIDs[uid];
}

let _firstTime = true;
export function updateSavedTabs() {
  if (_firstTime) {
    // When the tabs are just created, .getURL() returns an empty string
    _firstTime = false;
    return;
  }
  
  setImmediate(updateSavedTabsImmediately)
}
export function updateSavedTabsImmediately() {
  userData.lastlaunch.set({
    windows: getAllTabWindows().map(win => {
      return win.tabs.filter(tab => !tab.private).map(tab => ({
        title: tab.webContents.getTitle(),
        url: tab.webContents.getURL(),
        faviconURL: tab.faviconURL
      }))
    })
  })
}

function displayPreventUnloadDialog(win: BrowserWindow, url: string, sync?: boolean) {
  const options = {
    type: 'question',
    title: `Are you sure you want to leave "${URLParse(url).hostname}"?`,
    message: "This site might have some unsaved data.",
    buttons: ["Leave", "Stay"],
    cancelId: 1
  };

  if (sync) {
    return dialog.showMessageBoxSync(win, options) == 0;
  }
  return new Promise(async (resolve) => {
    resolve((await dialog.showMessageBox(win, options)).response == 0);
  });
}

function handleBeforeUnload<T>(wc: WebContents, proceed: () => T): Promise<false | T> {
  const code = `(function(){
    let bUnloadEvent = new Event('beforeunload', { cancelable: true })
    let isReturnValueSet = false;
    Object.defineProperty(bUnloadEvent, 'returnValue', {
      get: () => false,
      set(v) { isReturnValueSet = true },
      // Complying with crazy DOM standarts. https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event
      enumerable: true
    })
    window.dispatchEvent(bUnloadEvent)
    
    console.log("RETURN: ", bUnloadEvent.defaultPrevented, isReturnValueSet)
    return [bUnloadEvent.defaultPrevented, isReturnValueSet]
    })()
  `
  return new Promise(resolve => {
    // This is a race condition. Nereid gives the tab 3 seconds to react to the beforeunload event.
    // If it doesn't, the tab will be closed forcefully.

    let tooLateToExecute = false;
    let timeout = setTimeout(() => {
      resolve(proceed())
      tooLateToExecute = true;
    }, 3000);

    async function onCodeExecuted([isPrevented, isReturnValueSet]: [boolean, boolean]) {
      if (tooLateToExecute) return;

      clearTimeout(timeout);

      if (!shouldUseExperimentalBeforeUnload) {
        // Experimental beforeunload means the event needs to be prevented via .preventDefault()
        // This breaks some websites, and for some reason, youtube: YouTube will ALWAYS call
        // .preventDefault(). More info:
        // https://developer.mozilla.org/en-US/docs/Web/API/BeforeUnloadEvent
        isPrevented = isReturnValueSet;
      }
      
      if (isPrevented) {
        // TODO: make prettier dialog windows
        let response = await displayPreventUnloadDialog(BrowserWindow.fromWebContents(wc), wc.getURL())

        if (response) {
          // Leave
          resolve(proceed());

        } else {
          resolve(false)
        }

      } else {
        resolve(proceed())
      }
    }

    wc.mainFrame.executeJavaScript(code, true).then(onCodeExecuted)
    // If we call wc.executeJavaScript(), it doesn't actually execute it in some cases:
    // - if the url is "view-source:"
    // - if the tab was moved to another window
    // idk why, but this works
  })
}

export function setMutedTab(win: TabWindow, tab: Tab, isMuted: boolean) {
  tab.webContents.setAudioMuted(isMuted);
  win.chrome.webContents.send('tabUpdate', {
    type: 'muted', id: win.tabs.indexOf(tab),
    value: isMuted
  })
}


function setTitleOfWindow(win: TabWindow, tab: Tab) {
  if (tab.private) {
    win.setTitle(t('name'))

  } else {
    win.setTitle(`${tab.webContents.getTitle() || URLParse(tab.webContents.getURL()).hostname} - ${t('name')}`)
  }
}

async function fetchFavicon(url: string) {
  /** Needed to ignore the exception in electron-fetch (https://github.com/arantes555/electron-fetch/issues/46) */
  function _unthrow(error?) {
    if (error) console.log(`Ignored uncaught exception:`, error?.stack || error?.message);
    process.off('uncaughtException', _unthrow)
  }

  try {
    process.on('uncaughtException', _unthrow)
    let res = await fetch(url, { session: session.fromPartition(NO_CACHE_PARTITION) });
    _unthrow(null);
    if (res.ok && res.headers.get('Content-Type').startsWith('image/')) {
      return {
        url,
        dataURL: `data:${res.headers.get('Content-Type')};base64,${(await res.buffer()).toString('base64')}`
      }

    } else {
      return { url: null }
    }

  } catch (e) {
    console.log(`Icon could not be loaded:`, e);
    _unthrow(null);
    return { url: null }
  }
}

function checkSecurity(url: string) {
  if (url.startsWith('file:')) {
    return 'local';

  } else if (url.startsWith('nereid:') || url.startsWith('chrome:')) {
    return 'internal'

  } else {
    return validateDomainByURL(url);
  }
}

async function pushToHistory(tab: Tab, responseCode: number = 0) {
  const url = tab.webContents.getURL();

  if (tab.private) return; // obviously

  let history = await userData.history.get();
  if (
    history.length > 0 &&
    history[0].url == url &&
    history[0].sessionUUID == global.SESSION_UUID &&
    history[0].tabUID == tab.uniqueID
    // i know it's not the best way of not having duplicates but when the history gets large, it would be way slower to try to sort stuff in there
  ) { tab.lastNavigationReason = 'other'; return; }

  if (url.startsWith('nereid:')) return;
  if (global.isStarting) {
    // if the app is still starting, don't save the history
    tab.lastNavigationReason = 'other'; return;
  }

  history.unshift({
    sessionUUID: global.SESSION_UUID,
    tabUID: tab.uniqueID,
    timestamp: Date.now(),
    reason: responseCode.toString().startsWith('3') ? 'redirect' : tab.lastNavigationReason,
    url,
    title: tab.webContents.getTitle(),
    faviconURL: tab.faviconURL
  })
  userData.history.set(history)

  tab.lastNavigationReason = 'other'
}


/**
 * Creates a tab-like browserView and loads the URL.
 * @param  opts<`TabOptions`> Options
 * @returns  {BrowserView} The created `BrowserView`
 */
export function createBrowserView(opts: TabOptions): Tab {
  let tab = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      nodeIntegrationInSubFrames: true,
      nodeIntegrationInWorker: true,
      contextIsolation: true,
      sandbox: true,
      partition: opts.private ? PRIVATE_PARTITION : DEFAULT_PARTITION,
      preload: `${__dirname}/preloads/tab.js`,
      backgroundThrottling: true,
      autoplayPolicy: autoplayWithDocumentActivation ? 'document-user-activation-required' : 'user-gesture-required',
      navigateOnDragDrop: true
    }
  }) as Tab;

  if (!opts.uid) {
    let uid = UIDsAmount;
    UIDsAmount++;
    opts.uid = uid;
    tabUniqueIDs[uid] = tab;
  }
  tab.uniqueID = opts.uid;
  tab.lastNavigationReason = 'created';

  tab.webContents.loadURL(opts.url);
  tab.webContents.setVisualZoomLevelLimits(1, 3)
  tab.setBackgroundColor('#ffffffff'); // doesn't work for some reason

  tab.private = opts.private

  return tab;
}

export function destroyWebContents(bv: Tab) {
  delayExecution(() => {
    if (shouldCrashClosedTabs) {
      bv.webContents.forcefullyCrashRenderer();

    } else {
      (bv.webContents as any).destroy()
    }

    if (bv.childWindow) {
      bv.childWindow.close();
    }

    if (!bv.private) return;

    for (const uniqueID in tabUniqueIDs) {
      const tab = tabUniqueIDs[uniqueID];

      if (tab.private) return;
    }
    // if there are no private tabs, clear all session data
    let ses = session.fromPartition(PRIVATE_PARTITION);
    ses.clearStorageData()
    ses.clearAuthCache()
    ses.clearCache()
    ses.clearHostResolverCache()
    ses.closeAllConnections()
    console.log('cleared all private data');
    
  })
  return bv;
}

/**
 * Adds an already existing tab to a window
 * @param tab<`BrowserView`> the tab to be added
 */
export function addTab(win: TabWindow, tab: BrowserView, opts: TabOptions) {
  if ('position' in opts) {
    win.tabs.splice(opts.position, 0, tab)

  } else {
    win.tabs.push(tab);
  }
  win.chrome.webContents.send('addTab', opts)

  updateSavedTabs()
}

export function removeTab(win: TabWindow, { tab, id }: { tab?: BrowserView, id?: number }, keepAlive?: boolean) {
  if (tab) {
    id = win.tabs.indexOf(tab);
    if (id == -1) throw(new Error(`tabManager.removeTab: no tab found in window`))
  }

  if (win.currentTab == tab) {
    // select different tab if we're closing the current one
    if (id == 0) {
      if (win.tabs.length < 2) {
        if (keepAlive) return; //throw(new Error("tabManager.removeTab: The last tab can't be closed with keepAlive as true"));
        win.close(); // close the window if this is the last tab

      } else {
        selectTab(win, { id: 1 })
      }

    } else {
      selectTab(win, { id: id - 1 })
    }
  }
  
  win.tabs.splice(id, 1)
  
  win.chrome.webContents.send('removeTab', id)

  updateSavedTabs()
  return true;
}

export function attach(win: TabWindow, tab: Tab) {
  let getTabID = () => win.tabs.indexOf(tab)

  function sendUpdate(type: string, value: any) {
    win.chrome.webContents.send('tabUpdate', { type, id: getTabID(), value })
  }

  tab.owner = win;

  tab.webContents.setWindowOpenHandler(({ disposition, url, features }) => {
    console.log('opening new window:', disposition);
    
    switch (disposition) {
      case 'foreground-tab':
      case 'default': {
        createTab(win, { url, private: tab.private, position: getTabID() + 1 })
        return { action: 'deny' }
      }
      
      case 'background-tab': {
        createTab(win, { url, private: tab.private, background: true, position: getTabID() + 1 })
        return { action: 'deny' }
      }

      case 'new-window':
      case 'other': {
        if (features == '') {
          // when you open a window using Shift+Click, the features are an empty string
          newWindow([{ url, private: tab.private }])
          return { action: 'deny' }
        }

        if (tab.childWindow) return { action: 'deny' }

        tab.webContents.once('did-create-window', async(w) => {
          tab.childWindow = w;
          w.on('close', () => {
            delete tab.childWindow
          })

          w.webContents.on('did-fail-load', (e, code, desc, url, isMainFrame, ...args) => {
            handleNetError(w.webContents, e, code, desc, url, isMainFrame, ...args)
          })

          w.webContents.on('will-prevent-unload', (e) => {
            // always close child windows
            e.preventDefault();
          })

          w.webContents.on('zoom-changed', (_e, direction) => {
            if (direction == 'in') {
              w.webContents.zoomFactor += 0.1
            } else if (w.webContents.zoomFactor > 0.1) {
              w.webContents.zoomFactor -= 0.1
            }
          })

          w.webContents.on('context-menu', async (_e, opts) => {
            showContextMenu(win, { webContents: w.webContents, private: tab.private } as any, opts)
            // A terrible hack around the context menu but ok
          })

          w.webContents.setWindowOpenHandler(() => {
            return { action: 'deny' }
          })
        })

        return {
          action: 'allow', overrideBrowserWindowOptions: {
            minimizable: true,
            maximizable: true,
            closable: true,
            webPreferences: {
              sandbox: true,
              partition: tab.private ? PRIVATE_PARTITION : DEFAULT_PARTITION
            }
          }
        }
      }

      case 'save-to-disk': {
        tab.webContents.downloadURL(url)

        return { action: 'deny' }
      }
    
      default:
        return { action: 'deny' }
    }
  })

  tab.webContents.on('frame-created', (_e, { frame }) => {
    const code = `(function() {
      if ('[NEREID]' in window) return;

      // Preload script doesn't run in iframes without src, so we gotta run this ourselves using window.parent

      let { extendNavigator, extendWindow } = window.parent['[NEREID]'];
    
      for (let prop in extendNavigator) {
        window.navigator[prop] = extendNavigator[prop]
      }
      
      for (let prop in extendWindow) {
        window[prop] = extendWindow[prop]
      }
    }());`;
    frame.executeJavaScript(code).catch(err => {
      console.log("Unable to execute content script in %o: %s", frame.url, err);
    });
  })
  tab.webContents.on('did-start-loading', () => sendUpdate('status', true))
  tab.webContents.on('did-stop-loading', () => sendUpdate('status', false))
  tab.webContents.on('media-started-playing', () => sendUpdate('playing', true))
  tab.webContents.on('media-paused', () => sendUpdate('playing', false))

  tab.webContents.on('page-title-updated', (_e, title, isExplicit) => {
    sendUpdate('title', title);
    if (win.currentTab == tab) {
      setTitleOfWindow(win, tab)
    }
    if (!isExplicit) return;

    setImmediate(async() => {
      const history = await userData.history.get();
      if (history.length > 100) {
        // so we won't have to work with huge values
        history.length = 100;
      }
      let entry = history.find(item =>
        item.sessionUUID == global.SESSION_UUID &&
        item.tabUID == tab.uniqueID &&
        item.url.split('#')[0] == tab.webContents.getURL().split('#')[0] // do not include hashes into this
      );
      if (!entry) return;

      entry.title = title;
      userData.history.set(history)
    })
  })
  tab.webContents.on('page-favicon-updated', async(_e, favicons) => {
    let fUrl = URLParse(favicons[0]);

    if (tab.private) {
      // If in private mode, better not to fetch a favicon (the less requests - the better)
      tab.faviconURL = null;
      sendUpdate('favicon', `n-res://${nativeTheme.shouldUseDarkColors ? 'dark' : 'light'}/private.svg`);
      return;
    }
    
    let previousDataURL = tab.faviconDataURL;
    if (['http:', 'https:'].includes(fUrl.protocol)) {
      let { dataURL, url } = await fetchFavicon(fUrl.href);

      tab.faviconURL = url;
      tab.faviconDataURL = dataURL;
      
    } else {
      tab.faviconURL = null
    }
    if (previousDataURL != tab.faviconDataURL) sendUpdate('favicon', tab.faviconDataURL)
    setImmediate(async () => {
      let history = await userData.history.get();
      const thisPage = history.find(entry => 
        entry.sessionUUID == global.SESSION_UUID &&
        entry.tabUID == tab.uniqueID &&
        entry.url == tab.webContents.getURL()
      );
      if (!thisPage) return;
      if (thisPage.faviconURL == tab.faviconURL) return; // needed to not cause a useless write

      thisPage.faviconURL = tab.faviconURL;

      await userData.history.set(history);
    })
  })
  tab.webContents.on('will-prevent-unload', (e) => {
    // TODO: stop using this event in favor of 'will-navigate' (async)
    // or not... idk
    let leave = displayPreventUnloadDialog(
      BrowserWindow.fromWebContents(tab.webContents), tab.webContents.getURL(),
      true // syncronous
    );
    
    if (leave) {
      e.preventDefault();
    }
  })
  tab.webContents.on('did-navigate', async(_e, _u, respCode) => {
    const url = tab.webContents.getURL(); // not using the url argument because it doesnt show `view-source:` urls

    sendUpdate('url', url);
    sendUpdate('title', tab.webContents.getTitle()); 
    sendUpdate('nav', {
      canGoBack: tab.webContents.canGoBack(),
      canGoFwd: tab.webContents.canGoForward(),
    })

    sendUpdate('favicon', null)
    tab.faviconURL = null;

    sendUpdate('sec', checkSecurity(url))

    pushToHistory(tab, respCode)
  })
  tab.webContents.on('did-navigate-in-page', (_e, _url, isMainFrame) => {
    isMainFrame ? sendUpdate('url', tab.webContents.getURL()) : null;
    sendUpdate('nav', {
      canGoBack: tab.webContents.canGoBack(),
      canGoFwd: tab.webContents.canGoForward(),
    })

    pushToHistory(tab)
  })
  tab.webContents.on('did-fail-load', (e, code, desc, url, isMainFrame, ...args) => {
    handleNetError(tab.webContents, e, code, desc, url, isMainFrame, ...args)

    if (!isMainFrame) return;
    sendUpdate('url', url);
    sendUpdate('nav', {
      canGoBack: tab.webContents.canGoBack(),
      canGoFwd: tab.webContents.canGoForward(),
    })
    if (url.startsWith('file:')) {
      sendUpdate('sec', 'local')

    } else if (url.startsWith('nereid:')) {
      sendUpdate('sec', 'internal')

    } else {
      sendUpdate('sec', false)
    }
  })
  tab.webContents.on('render-process-gone', (_e, details) => {
    sendUpdate('crash', details)
    tab.webContents.once('did-start-loading', () => {
      sendUpdate('crash', null)
    })
  })
  tab.webContents.on('zoom-changed', (_e, direction) => {
    if (direction == 'in') {
      tab.webContents.zoomFactor += 0.1
    } else if (tab.webContents.zoomFactor > 0.15) {
      tab.webContents.zoomFactor -= 0.1
    }

    if (win.currentTab == tab) {
      win.chrome.webContents.send('zoomUpdate', tab.webContents.zoomFactor)
    }
  })

  tab.webContents.on('cursor-changed', (_e, cursor) => {
    win.chrome.webContents.send('tabCursorChange', cursor)
  })
  tab.webContents.on('found-in-page', (_e, result) => {
    win.chrome.webContents.send('found', getTabID(), result)
  })

  tab.webContents.on('enter-html-full-screen', () => {
    tab.setBounds({ x: 0, y: 0, width: win.getContentBounds().width, height: win.getContentBounds().height })
  })
  tab.webContents.on('leave-html-full-screen', () => {
    setCurrentTabBounds(win, tab)
  })
  tab.webContents.on('context-menu', (_e, opts) => {
    showContextMenu(win, tab, opts)
  })
}

export function detach(tab: Tab) {
  tab.webContents.removeAllListeners()
  tab.owner = null;
}

/**
 * Selects an existing tab of the window `win`
 * @param  {object} description { `tab`: the tab to select, (or) `id`: the index of the tab to select from all the tabs on window }
 */
export function selectTab(win: TabWindow, { tab, id }: { tab?: Tab, id?: number }) {
  if (tab) {
    id = win.tabs.indexOf(tab);
    if (id == -1) throw(new Error(`tabManager.selectTab: no tab found in window`))
  }
  tab = tab || win.tabs[id];

  win.currentTab ? win.removeBrowserView(win.currentTab) : null;
  win.addBrowserView(tab)
  win.currentTab = tab;
  
  setCurrentTabBounds(win)
  win.setTopBrowserView(tab);
  win.chrome.webContents.send('tabChange', id)
  win.chrome.webContents.send('zoomUpdate', tab.webContents.zoomFactor)
    // Zoom is global and changed every time the tab is changed
    // That's because chrome has a same-origin zoom policy.
  //

  setTitleOfWindow(win, tab)
}

/**
 * Creates a new tab on `window`
 * @returns  {BrowserView} The created tab
 */
export function createTab(window: TabWindow, options: TabOptions): Tab {
  let bv = createBrowserView(options);
  setCurrentTabBounds(window, bv) // better to resize here or will slow down the tab switching
  addTab(window, bv, options);
  attach(window, bv)
  options.background || selectTab(window, { tab: bv })
  return bv;
}

let beingClosed: Tab;
export function closeTab(win: TabWindow, desc: { tab?: Tab, id?: number }, keepAlive?: boolean) {
  if (!desc.tab) desc.tab = win.tabs[desc.id]
  if (!desc.id) desc.id = win.tabs.indexOf(desc.tab)

  function close() {
    beingClosed = null;

    let remResult = removeTab(desc.tab.owner, desc, keepAlive);
    if (!remResult) return false;

    detach(desc.tab)
    let lastURL = desc.tab.webContents.getURL()
    let lastTitle = desc.tab.webContents.getTitle()
    let tab = destroyWebContents(desc.tab);
    if (tab.private) {
      delete tabUniqueIDs[tab.uniqueID];
      return tab;

    } else {
      win.recentlyClosed.push({
        tab,
        index: desc.id,
        UID: tab.uniqueID,
        lastURL, lastTitle
      });
      if (win.recentlyClosed.length > userData.config.get().behaviour.maxRecentTabs) {
        delete tabUniqueIDs[win.recentlyClosed[0].UID];
        win.recentlyClosed.shift();
      }
      return tab;
    }
  }

  if (beingClosed == desc.tab) {
    console.log(`The tab ${desc.id} is already being closed`);
    return;
  }
  beingClosed = desc.tab;
  
  return handleBeforeUnload(desc.tab.webContents, close)
}

export function openClosedTab(win: TabWindow, index?: number, background: boolean = true) {
  let tabInfo: typeof win.recentlyClosed[0];
  if (win.recentlyClosed.length < 1) return false;
  if (index) {
    tabInfo = win.recentlyClosed[index];
    win.recentlyClosed.splice(index, 1)

  } else {
    tabInfo = win.recentlyClosed.pop()
  }

  let options: TabOptions = {
    uid: tabInfo.UID,
    position: tabInfo.index,
    url: tabInfo.lastURL,
    background
  }

  if (shouldCrashClosedTabs) {
    tabInfo.tab.webContents.reload()
  } else {
    tabInfo.tab = createBrowserView(options)
  }

  addTab(win, tabInfo.tab, options)
  attach(win, tabInfo.tab)

  return true;
}

export function moveTab(win: TabWindow, tab: Tab, newID: number) {
  if (win.tabs.length == 1) return;

  removeTab(win, { tab })
  addTab(win, tab, {
    url: tab.webContents.getURL(),
    initialFavicon: tab.faviconDataURL,
    private: tab.private,
    position: newID
  })
  
  win.chrome.webContents.send('tabUpdate', {
    type: 'title', id: newID,
    value: tab.webContents.getTitle() || tab.webContents.getURL()
  })
  win.chrome.webContents.send('tabUpdate', {
    type: 'sec', id: newID,
    value: checkSecurity(tab.webContents.getURL())
  })

  selectTab(win, { id: newID })
}

export function crossMoveTab(tab: Tab, destination: { window: TabWindow, index: number }) {
  const { window, index } = destination;
  if (!tab.owner) return;

  let { owner } = tab
  if (owner != window) {
    detach(tab)
  }
  removeTab(owner, { tab: tab })
  addTab(window, tab, {
    url: tab.webContents.getURL(),
    initialFavicon: tab.faviconDataURL,
    private: tab.private,
    position: index,
    uid: tab.uniqueID
  })
  if (owner != window) {
    attach(window, tab)
  }

  window.chrome.webContents.send('tabUpdate', {
    type: 'title', id: index,
    value: tab.webContents.getTitle() || tab.webContents.getURL()
  })
  window.chrome.webContents.send('tabUpdate', {
    type: 'sec', id: index,
    value: checkSecurity(tab.webContents.getURL())
  })
  window.chrome.webContents.send('tabUpdate', {
    type: 'playing', id: index,
    value: tab.webContents.isCurrentlyAudible()
  })
  window.chrome.webContents.send('tabUpdate', {
    type: 'muted', id: index,
    value: tab.webContents.isAudioMuted()
  })

  selectTab(window, { id: index })
}


// Every few seconds, lastlaunch should update
let backupIntervalFlag = options.backup_tabs_interval;

setInterval(updateSavedTabs, backupIntervalFlag?.type == 'num' ? backupIntervalFlag.value : 30000)
