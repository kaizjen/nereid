// Tabs' creation, removal and whatever else

import type { TabWindow, TabOptions, Tab, RealTab, PaneView } from "./types";
import { BrowserView, BrowserViewConstructorOptions, BrowserWindow, dialog, nativeTheme, session, WebContents, WebPreferences } from "electron";
import fetch from "electron-fetch";
import * as userData from './userdata'
import { DEFAULT_PARTITION, NO_CACHE_PARTITION, PRIVATE_PARTITION, validateDomainByURL } from './sessions'
import { handleNetError } from './net-error-analyzer'
import $ from './common'
import { showContextMenu } from "./menu";
import { getAllTabWindows, newSingleTabWindow, newTabWindow, setCurrentTabBounds } from "./windows";
import { t } from "./i18n";
import { addTabToGroup, destroyEmptyGroups, getTabGroupByID, getTabGroupByTab } from "./tabgroups";
import { EventEmitter } from "events";
import type TypedEmitter from "typed-emitter";

const { URLParse } = $

// Global unique identifiers of all tabs.
const tabUniqueIDs: { [uniqueID: number]: Tab | null } = {} // not an array because we don't really need its cool methods
let UIDsAmount = 0;

const options = userData.control.options;

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

type ChromeTabState = {
  background: boolean
  url: string
  title: string
  favicon: string | null
  private: boolean
  security: 'internal' | 'local' | true | false
  isLoading: boolean
  nav: {
    canGoBack: boolean
    canGoFwd: boolean
  },
  uid: number
  crashDetails: Electron.RenderProcessGoneDetails | null
  isPlaying: boolean
  isMuted: boolean
}

type Preventable = { preventDefault(): void }
type TabEvents = {
  browserViewCreated(o: { browserView: RealTab }): any
  selectTab(o: Preventable & { win: TabWindow, tab: Tab }): any
  createTab(o: Preventable & { win: TabWindow, options: TabOptions }): any
  closeTab(o: Preventable & { win: TabWindow, tab: Tab }): any
  moveTab(o: Preventable & {
    tab: Tab, destination: { window: TabWindow, index: number }, shouldSelect: boolean, preventPinning: boolean
  }): any
}


export const tabEvents = new EventEmitter() as TypedEmitter<TabEvents>;
/** Returns `true` if the event wasn't prevented */
function emitPreventable<T extends keyof TabEvents>(
  eventName: T,
  arg: Omit<Parameters<TabEvents[T]>[0], 'preventDefault'>,
) {
  let defaultPrevented = false;
  (arg as any).preventDefault = () => defaultPrevented = true;

  (tabEvents.emit as any)(eventName, arg);

  return !defaultPrevented;
}

export function getTabByUID(uid: number) {
  return tabUniqueIDs[uid];
}
export function asRealTab(tab: Tab) {
  // This function isn't used when we're checking all tabs (like `win.tabs.find(tab => (tab as RealTab).webContents == wc)`)
  // Otherwise, if there's at least one ghost tab, it will throw
  if (tab.isGhost) throw new Error("Assertion failed: this tab is a Ghost Tab.");
  if (!(tab as RealTab).webContents) throw new Error("Assertion failed: this tab does not have a WebContents attached to it.");
  return tab as RealTab;
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
      return win.tabs.filter(tab => !tab.private).map(tab => (
        tab.isGhost ? {
          title: tab.title,
          url: tab.url,
          faviconURL: tab.faviconURL
        } : {
          title: asRealTab(tab).webContents.getTitle(),
          url: asRealTab(tab).webContents.getURL(),
          faviconURL: tab.faviconURL
        }
      ))
    })
  })
}

function displayPreventUnloadDialog(win: BrowserWindow, url: string, sync?: boolean) {
  // this function has to be synchronous D:
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
        let response = await displayPreventUnloadDialog(BrowserWindow.fromWebContents(wc), wc.getURL())

        if (response) {
          // Leave
          resolve(proceed());

        } else {
          resolve(false)
          beingClosed.splice(beingClosed.findIndex(tab => asRealTab(tab).webContents == wc), 1);
        }

      } else {
        resolve(proceed())
      }
    }

    wc.mainFrame.executeJavaScript(code, true).then(onCodeExecuted)
    // If we call wc.executeJavaScript(), it doesn't actually execute it in some cases:
    // - if the protocol is "view-source:"
    // - if the tab was moved to another window
    // in these cases, electron for some reason thinks that webFrame hasn't finished loading yet,
    // so it waits indefinitely for it to load ¯\_(ツ)_/¯
  })
}

export function setMutedTab(win: TabWindow, tab: Tab, isMuted: boolean) {
  const realTab = toRealTab(tab)

  realTab.webContents.setAudioMuted(isMuted);
  win.chrome.webContents.send('tabUpdate', {
    index: win.tabs.indexOf(realTab),
    state: { isMuted }
  })
}


function setTitleOfWindow(win: TabWindow, tab: RealTab) {
  if (tab.private) {
    win.setTitle(t('name'))

  } else {
    win.setTitle(`${tab.webContents.getTitle() || URLParse(tab.webContents.getURL()).hostname} - ${t('name')}`)
  }
}

async function fetchFavicon(url: string) {
  try {
    let res = await fetch(url, { session: session.fromPartition(NO_CACHE_PARTITION) });
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
  const url = asRealTab(tab).webContents.getURL();

  if (tab.private) return; // obviously
  if (tab.isOpenedAtStart) {
    tab.isOpenedAtStart = false;
    return;
  }

  let history = await userData.history.get();
  if (
    history.length > 0 &&
    history[0].url == url &&
    history[0].sessionUUID == global.SESSION_UUID &&
    history[0].tabUID == tab.uniqueID
    // i know it's not the best way of not having duplicates but when the history gets large, it would be way slower to try to sort stuff in there
  ) { tab.lastNavigationReason = 'other'; return; }

  if (url.startsWith('nereid:')) return;

  history.unshift({
    sessionUUID: global.SESSION_UUID,
    tabUID: tab.uniqueID,
    timestamp: Date.now(),
    reason: responseCode.toString().startsWith('3') ? 'redirect' : tab.lastNavigationReason,
    url,
    title: asRealTab(tab).webContents.getTitle(),
    faviconURL: tab.faviconURL
  })
  userData.history.set(history)

  tab.lastNavigationReason = 'other'
}


type CreateBrowserViewOptions = {
  addWebPreferences?: Partial<WebPreferences>
  overrideWebPreferences?: Partial<WebPreferences>
  attachWebContents?: WebContents
}
/**
 * Creates a tab-like browserView and loads the URL.
 * @param  opts<`TabOptions`> Options
 * @returns  {BrowserView} The created `BrowserView`
 */
export function createBrowserView(
  opts: TabOptions,
  { addWebPreferences = {}, overrideWebPreferences = {}, attachWebContents = null }: CreateBrowserViewOptions = {}
): RealTab {
  const constructorOptions: BrowserViewConstructorOptions = {
    webPreferences: {
      ...addWebPreferences,
      nodeIntegration: false,
      nodeIntegrationInSubFrames: true,
      nodeIntegrationInWorker: true,
      contextIsolation: true,
      sandbox: true,
      partition: opts.private ? PRIVATE_PARTITION : DEFAULT_PARTITION,
      preload: `${__dirname}/preloads/tab.js`,
      backgroundThrottling: true,
      autoplayPolicy: autoplayWithDocumentActivation ? 'document-user-activation-required' : 'user-gesture-required',
      navigateOnDragDrop: true,
      ...overrideWebPreferences
    }
  }
  if (attachWebContents) {
    // Undocumented `webContents` option allows for attaching already existing webContents
    constructorOptions['webContents'] = attachWebContents;
  }
  let tab = new BrowserView(constructorOptions) as RealTab;

  if (!opts.uid) {
    let uid = UIDsAmount;
    UIDsAmount++;
    opts.uid = uid;
  }
  tabUniqueIDs[opts.uid] = tab;
  tab.uniqueID = opts.uid;
  tab.lastNavigationReason = 'created';

  tab.webContents.loadURL(opts.url);
  tab.webContents.setVisualZoomLevelLimits(1, 3)
  tab.setBackgroundColor('#ffffffff'); // doesn't work for some reason

  tab.private = opts.private
  tab.isOpenedAtStart = opts.isOpenedAtStart
  tab.isGhost = false;
  tab.history = [];
  tab.currentHistoryIndex = -1;

  tabEvents.emit('browserViewCreated', { browserView: tab });

  return tab;
}

export function destroyWebContents(bv: RealTab) {
  delayExecution(() => {
    bv.webContents.close();

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
 * @param win The window to which the tab should be added
 * @param tab The tab to be added
 * @param addOptions
 *  * `forcePin` If the tab is added before `win.pinnedTabsEndIndex`,
 *  don't move it, but let it be pinned as well. **This should never be used when
 *  moving a non-pinned tab.**
 */
export function addTab(win: TabWindow, tab: Tab, opts: TabOptions, addOptions = { forcePin: false }) {
  if (opts.position != undefined) {
    if (opts.position <= win.pinnedTabsEndIndex) {
      if (addOptions.forcePin) {
        win.pinnedTabsEndIndex++;
        win.chrome.webContents.send('pinnedTabsEndIndexUpdate', win.pinnedTabsEndIndex)

      } else if (opts.position != win.pinnedTabsEndIndex) {
        console.log(
          `The TabOptions.position property was changed from ${opts.position} to ${win.pinnedTabsEndIndex} because`,
          'a tab can only be added after all the pinned tabs.'
        );
        opts.position = win.pinnedTabsEndIndex
      }
    }
    win.tabs.splice(opts.position, 0, tab)

  } else {
    win.tabs.push(tab);
  }
  win.chrome.webContents.send('addTab', opts)

  win.tabGroups.forEach(g => {
    if (win.tabs.indexOf(tab) <= g.startIndex) {
      g.startIndex++;
    }
    if (win.tabs.indexOf(tab) < g.endIndex) {
      g.endIndex++;
    }
    win.chrome.webContents.send('tabGroupUpdate', g)
  })

  if (opts.groupID != undefined) {
    addTabToGroup(win, getTabGroupByID(opts.groupID).group, tab)
  }

  updateSavedTabs()
}

export function removeTab(win: TabWindow, { tab, index }: { tab?: Tab, index?: number }, keepAlive?: boolean) {
  if (tab) {
    index = win.tabs.indexOf(tab);
    if (index == -1) throw(new Error(`tabManager.removeTab: no tab found in window`))
  }

  function selectOtherPane(ifNotInPaneView: () => any) {
    if (tab.paneView) {
      let otherTab: Tab;
      if (tab.paneView.leftTab == tab) {
        otherTab = tab.paneView.rightTab

      } else {
        otherTab = tab.paneView.leftTab
      }

      selectTab(win, { tab: otherTab })

    } else {
      ifNotInPaneView()
    }
  }

  if (win.currentTab == tab) {
    // select different tab if we're closing the current one
    if (index == 0) {
      if (win.tabs.length < 2) {
        if (keepAlive) return false;
        win.removeBrowserView(tab);
        win.close(); // close the window if this is the last tab

      } else {
        selectOtherPane(() => selectTab(win, { index: 1 }))
      }

    } else {
      selectOtherPane(() => selectTab(win, { index: index - 1 }))
    }
  }

  if (win.pinnedTabsEndIndex > index) {
    win.pinnedTabsEndIndex--;
    win.chrome.webContents.send('pinnedTabsEndIndexUpdate', win.pinnedTabsEndIndex)
  }

  win.tabs.splice(index, 1)
  win.chrome.webContents.send('removeTab', index)

  win.tabGroups.forEach(g => {
    if (index < g.startIndex) {
      g.startIndex--;
    }
    if (index < g.endIndex) {
      g.endIndex--;
    }
    win.chrome.webContents.send('tabGroupUpdate', g)
  })

  destroyEmptyGroups(win)

  updateSavedTabs()
  return true;
}

export function updateTabState(win: TabWindow, { tab, index }: { tab?: Tab, index?: number }) {
  if (tab) {
    index = win.tabs.indexOf(tab);
    if (index == -1) throw (new Error(`tabManager.updateTabState: no tab found in window`))
  }
  tab = tab || win.tabs[index]

  if (tab.isGhost) {
    win.chrome.webContents.send('tabUpdate', {
      index,
      state: {
        title: tab.title,
        url: tab.url,
        private: tab.private,
        uid: tab.uniqueID,
        favicon: tab.faviconDataURL || tab.faviconURL
      }
    })

  } else {
    win.chrome.webContents.send('tabUpdate', {
      index,
      state: {
        title: asRealTab(tab).webContents.getTitle() || asRealTab(tab).webContents.getURL(),
        url: asRealTab(tab).webContents.getURL(),
        nav: {
          canGoBack: asRealTab(tab).webContents.canGoBack(),
          canGoFwd: asRealTab(tab).webContents.canGoForward()
        },
        security: checkSecurity(asRealTab(tab).webContents.getURL()),
        isPlaying: asRealTab(tab).webContents.isCurrentlyAudible(),
        isMuted: asRealTab(tab).webContents.isAudioMuted(),
        private: tab.private,
        uid: tab.uniqueID,
        favicon: tab.faviconDataURL || tab.faviconURL
      }
    })
  }
}

export function attach(win: TabWindow, tab: RealTab) {
  let getTabIndex = () => win.tabs.indexOf(tab)

  function sendUpdate(state: Partial<ChromeTabState>) {
    win.chrome.webContents.send('tabUpdate', { index: getTabIndex(), state })
  }

  tab.owner = win;

  // Remove the default Electron listeners
  tab.webContents.removeAllListeners('-new-window');
  tab.webContents.removeAllListeners('-add-new-contents');

  // MAY BREAK: Check every time before bumping Electron!
  // Undocumented listener for when a USER clicks a link
  tab.webContents.on('-new-window' as any, (
    _e: Electron.Event, url: string, frameName: string, disposition: Electron.HandlerDetails['disposition'],
    _feats: any, referrer: Electron.Referrer
  ) => {
    const tabGroup = getTabGroupByTab(tab);
    const gid = tabGroup ? tabGroup.id : null

    console.log(`-new-window event: `, { referrer, disposition });

    switch (disposition) {
      case 'foreground-tab':
      case 'default': {
        if (frameName && URLParse(tab.webContents.getURL()).origin == URLParse(url).origin) {
          const targetTab = win.tabs.find(t => t.targetFrameName == frameName);

          function doesURLMatch() {
            const targetURL = toRealTab(targetTab).webContents.getURL();
            return URLParse(targetURL).origin == URLParse(url).origin;
          }
          if (targetTab && doesURLMatch()) {
            toRealTab(targetTab).webContents.loadURL(url);
            return selectTab(win, { tab: targetTab })

          } else {
            return createTab(win, {
              url, private: tab.private,
              targetFrameName: frameName,
              position: getTabIndex() + 1,
              groupID: gid
            })
          }
        }
        return createTab(win, { url, private: tab.private, position: getTabIndex() + 1, groupID: gid })
      }

      case 'background-tab': {
        return createTab(win, { url, private: tab.private, background: true, position: getTabIndex() + 1, groupID: gid })
      }

      case 'new-window':
      case 'other': {
        // Usually doesn't happen
        return newTabWindow([{ url, private: tab.private }])
      }
    }
  })
  tab.webContents.setWindowOpenHandler(({ disposition }) => {
    // This will now ONLY run on `window.open()` calls because
    // the default Electron listener for `-new-window` used to call this
    if (disposition == 'new-window' || disposition == 'other') {
      if (tab.childWindow) {
        tab.webContents.executeJavaScript(`console.warn("Scripts may only open one window at a time.")`);
        return { action: 'deny' }
      };
    }
    return { action: 'allow' }
  })
  // Undocumented listener for when a new WebContents are created
  tab.webContents.on('-add-new-contents' as any, async (
    _e: Electron.Event, newWebContents: Electron.WebContents, disposition: string,
    userGesture: boolean, _left: number, _top: number, _width: number, _height: number, url: string, frameName: string,
    _referrer: Electron.Referrer, features: string
  ) => {
    console.log('window.open:', { userGesture, disposition, url, features, frameName });

    if (!userGesture) {
      // We only get the `userGesture` parameter here, so we have to resort
      // to closing the webContents.
      // TODO: implement a permission-based system
      newWebContents.close();
      return console.log("Refused to open a window without user interaction.");
    }

    const { windowOptions, webPreferences } = $.parseWindowOpenFeatures(features);

    const tabGroup = getTabGroupByTab(tab);
    const gid = tabGroup ? tabGroup.id : null;

    switch (disposition) {
      case 'foreground-tab':
      case 'default': {
        if (frameName && URLParse(tab.webContents.getURL()).origin == URLParse(url).origin) {
          const targetTab = win.tabs.find(t => t.targetFrameName == frameName);

          function doesURLMatch() {
            const targetURL = toRealTab(targetTab).webContents.getURL();
            return URLParse(targetURL).origin == URLParse(url).origin;
          }
          if (targetTab && doesURLMatch()) {
            toRealTab(targetTab).webContents.loadURL(url);
            return selectTab(win, { tab: targetTab })

          } else {
            return createTab(win, {
              url, private: tab.private,
              targetFrameName: frameName,
              position: getTabIndex() + 1,
              groupID: gid
            }, {
              attachWebContents: newWebContents, addWebPreferences: webPreferences
            })
          }
        }
        return createTab(
          win,
          { url, private: tab.private, position: getTabIndex() + 1, groupID: gid }, 
          { attachWebContents: newWebContents, addWebPreferences: webPreferences }
        );
      }

      case 'background-tab': {
        return createTab(
          win,
          { url, private: tab.private, background: true, position: getTabIndex() + 1, groupID: gid },
          { attachWebContents: newWebContents, addWebPreferences: webPreferences }
        );
      }

      case 'new-window':
      case 'other': {
        const newTab = createBrowserView(
          { url, private: tab.private },
          { attachWebContents: newWebContents, addWebPreferences: webPreferences }
        );

        return tab.childWindow = await newSingleTabWindow(newTab, windowOptions, tab);
      }

      case 'save-to-disk': {
        // idk when this happens and what to do with it
        dialog.showMessageBox({ message: t('unimplemented') })
        return;
      }

      default:
        return;
    }
  })
  // About new windows: Although non-standard, Nereid should try to
  // minimize the amount of windows (not tabs) that websites can open because
  // having a lot of windows opened by one tab can be confusing and
  // disruptive to the UX. Also, it's important to close all the windows
  // opened by sites to prevent pop-unders and make the browser
  // "idiot-proof" (not die when you visit youareanidiot.cc)

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
  tab.webContents.on('did-start-loading', () => sendUpdate({ isLoading: true }))
  tab.webContents.on('did-stop-loading', () => sendUpdate({ isLoading: false }))
  tab.webContents.on('media-started-playing', () => sendUpdate({ isPlaying: true }))
  tab.webContents.on('media-paused', () => sendUpdate({ isPlaying: false }))

  tab.webContents.on('focus', () => {
    // when this tab is a part of a PaneView, it needs to update the address bar URL
    if (win.currentTab == tab) return;

    selectTab(win, { tab });
  })
  tab.webContents.on('page-title-updated', (_e, title, isExplicit) => {
    sendUpdate({ title });
    if (win.currentTab == tab) {
      setTitleOfWindow(win, tab)
    }
    if (!isExplicit) return;

    setImmediate(async() => {
      const history = await userData.history.get();
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
      sendUpdate({ favicon: `n-res://${nativeTheme.shouldUseDarkColors ? 'dark' : 'light'}/private.svg` });
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
    if (previousDataURL != tab.faviconDataURL) sendUpdate({ favicon: tab.faviconDataURL })

    tab.history[tab.currentHistoryIndex].faviconURL = tab.faviconURL;

    setImmediate(async () => {
      let history = await userData.history.get();
      if (!tab.webContents) return; // sometimes the tab is already closed at this point

      const thisPage = history.find(entry =>
        entry.sessionUUID == global.SESSION_UUID &&
        entry.tabUID == tab.uniqueID &&
        encodeURI(entry.url) == tab.webContents.getURL()
      );
      if (!thisPage) return;
      if (thisPage.faviconURL == tab.faviconURL) return; // needed to not cause a useless write

      thisPage.faviconURL = tab.faviconURL;

      await userData.history.set(history);
    })
    setImmediate(async () => {
      let bookmarks = await userData.bookmarks.get();
      if (!tab.webContents) return;

      for (const folder in bookmarks) {
        const bms = bookmarks[folder];
        const thisPage = bms.find(entry =>
          encodeURI(entry.url) == tab.webContents.getURL()
        )
        if (!thisPage) continue;
        if (thisPage.iconURL == tab.faviconURL) continue;

        thisPage.iconURL = tab.faviconURL;

        await userData.bookmarks.set(bookmarks);
      }
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

    sendUpdate({ url });
    sendUpdate({ title: tab.webContents.getTitle() });
    sendUpdate({
      nav: {
        canGoBack: tab.webContents.canGoBack(),
        canGoFwd: tab.webContents.canGoForward(),
      }
    })

    if (tab.history[tab.currentHistoryIndex])
    if (URLParse(tab.history[tab.currentHistoryIndex].url).hostname != URLParse(url).hostname) {
      // if the host has changed, update the favicon
      sendUpdate({ favicon: null })
      tab.faviconURL = null;
    }

    tab.history.push({ title: tab.webContents.getTitle(), url, faviconURL: tab.faviconURL })
    tab.currentHistoryIndex++;
    tab.targetFrameName = null;

    sendUpdate({ security: checkSecurity(url) })

    pushToHistory(tab, respCode)
  })
  tab.webContents.on('did-navigate-in-page', (_e, _url, isMainFrame) => {
    if (!isMainFrame) return;
    sendUpdate({ url: tab.webContents.getURL() });
    sendUpdate({
      nav: {
        canGoBack: tab.webContents.canGoBack(),
        canGoFwd: tab.webContents.canGoForward(),
      }
    })

    pushToHistory(tab)
  })
  tab.webContents.on('did-fail-load', (e, code, desc, url, isMainFrame, ...args) => {
    if (isMainFrame && url != tab.webContents.getURL()) return; // The tab has already loaded a new URL

    handleNetError(tab.webContents, e, code, desc, url, isMainFrame, ...args)

    if (!isMainFrame) return;
    sendUpdate({ url });
    sendUpdate({
      nav: {
        canGoBack: tab.webContents.canGoBack(),
        canGoFwd: tab.webContents.canGoForward(),
      }
    })
    if (url.startsWith('file:')) {
      sendUpdate({ security: 'local' })

    } else if (url.startsWith('nereid:')) {
      sendUpdate({ security: 'internal' })

    } else {
      sendUpdate({ security: false })
    }
  })
  tab.webContents.on('dom-ready', async() => {
    // Update the thumbnail in bookmarks
    const code = `document.querySelector('meta[property="og:image"]')?.getAttribute('content')`;
    const ogImage = await tab.webContents.mainFrame.executeJavaScript(code)
      .catch(e => console.log('ogImage failed:', e)) as string
    ;
    if (!ogImage) return;

    let bookmarks = await userData.bookmarks.get();
    for (const folder in bookmarks) {
      const bms = bookmarks[folder];
      const thisPage = bms.find(entry =>
        encodeURI(entry.url) == tab.webContents.getURL()
      )
      if (!thisPage) continue;
      if (thisPage.thumbnailURL == ogImage) continue;

      thisPage.thumbnailURL = ogImage;

      await userData.bookmarks.set(bookmarks);
    }
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
    win.chrome.webContents.send('found', getTabIndex(), result)
  })

  tab.webContents.on('enter-html-full-screen', () => {
    asRealTab(tab).setBounds({ x: 0, y: 0, width: win.getContentBounds().width, height: win.getContentBounds().height })
    win.chrome.webContents.send('paneDividerOnTop', true)
  })
  tab.webContents.on('leave-html-full-screen', () => {
    setCurrentTabBounds(win, tab)
    win.chrome.webContents.send('paneDividerOnTop', false)
  })
  tab.webContents.on('context-menu', (_e, opts) => {
    showContextMenu(win, tab, opts)
  })
  tab.webContents.on('devtools-open-url' as any, (_e, url: string) => {
    // The default Electron types here are wrong >:(
    createTab(win, { url, position: getTabIndex() + 1 })
  })

  tab.webContents.on('render-process-gone', (_e, crashDetails) => {
    sendUpdate({ crashDetails })
    tab.webContents.once('did-start-loading', () => {
      sendUpdate({ crashDetails: null })
    })
  })
  tab.webContents.on('destroyed', () => {
    console.log(`Web contents #${tab.webContents.id} was destroyed, closing the corresponding tab`);
    // Close it manually without using `closeTab()` so that no references to the WC would be made.
    // (also we can't get the tab's URL at all)
    // This has a side effect of the tab not appearing in the recently closed menu.
    try {
      // Temporarily make this a Ghost Tab so the WC wouldn't be referenced.
      tab.isGhost = true as any;
      detach(tab);
      setImmediate(() => {
        // If not for the `setImmediate()`, it just crashes
        removeTab(win, { tab });
      })

    } catch (error) {
      console.log(`Couldn't close the tab: ${error + ''}`);
    }
  })
}

export function detach(tab: RealTab) {
  // `tab.webContents.removeAllListeners()` doesn't work because it removes some of
  // electron's internal listeners, which breaks the preload script completely
  const listenersArray = [
    'frame-created',
    'did-start-loading',
    'did-stop-loading',
    'media-started-playing',
    'media-paused',
    'focus',
    'page-title-updated',
    'page-favicon-updated',
    'will-prevent-unload',
    'did-navigate',
    'did-navigate-in-page',
    'did-fail-load',
    'dom-ready',
    'zoom-changed',
    'cursor-changed',
    'found-in-page',
    'enter-html-full-screen',
    'leave-html-full-screen',
    'context-menu',
    'devtools-open-url',
    'render-process-gone',
    'destroyed',
  ];
  listenersArray.forEach(event => {
    tab.webContents.removeAllListeners(event)
  })
  tab.webContents.setWindowOpenHandler(null)
  if (tab.paneView && !tab.owner.isDestroyed()) {
    undividePanes(tab.owner, tab.paneView)
  }
  tab.owner = null;
}

/**
 * Converts a GhostTab to a real one. After the creation of the RealTab,
 * the `tab` object passed to this function is discarded and should not be used.
 */
export function toRealTab(tab: Tab) {
  if (!tab.isGhost) return asRealTab(tab);

  const { owner } = tab;
  const index = owner.tabs.indexOf(tab);
  if (index == -1) throw new Error("Conversion failed: the specified GhostTab is not present in the window.");

  let realTab = createBrowserView({
    url: tab.url,
    uid: tab.uniqueID,
    private: tab.private,
    isOpenedAtStart: tab.isOpenedAtStart
  });
  owner.tabs[index] = realTab;
  owner.chrome.webContents.send('tabUpdate', {
    index: index, state: { isLoading: true }
  })
  attach(owner, realTab)

  return realTab;
}

/**
 * Selects an existing tab of the window `win`
 * @param  {object} description { `tab`: the tab to select, (or) `index`: the index of the tab to select from all the tabs on window }
 * 
 * Returns `false` if the tab selection was prevented by the `selectTab` event handler
 */
export function selectTab(win: TabWindow, { tab, index }: { tab?: Tab, index?: number }): Tab | false {
  if (tab) {
    index = win.tabs.indexOf(tab);
    if (index == -1) throw(new Error(`tabManager.selectTab: no tab found in window`))
  }
  tab = tab || win.tabs[index];

  if (!emitPreventable('selectTab', { win, tab })) return false;

  if (!win.tabs[index]) throw new Error(`tabManager.selectTab: tab #${index} is not in window`)

  if (win.currentPaneView) {
    win.removeBrowserView(win.currentPaneView.leftTab);
    win.removeBrowserView(win.currentPaneView.rightTab);
    win.currentTab = null; // So we don't call `removeBrowserView` twice
  }
  if (win.currentTab) win.removeBrowserView(win.currentTab);
  if (tab.isGhost) {
    tab = toRealTab(tab);
  }

  win.currentPaneView = null;
  if (tab.paneView) {
    if (tab == tab.paneView.leftTab) {
      win.addBrowserView(asRealTab(tab.paneView.rightTab))

    } else {
      win.addBrowserView(asRealTab(tab.paneView.leftTab))
    }
    win.currentPaneView = tab.paneView;
  }

  win.addBrowserView(asRealTab(tab))
  win.currentTab = asRealTab(tab);

  setCurrentTabBounds(win)
  win.setTopBrowserView(asRealTab(tab));
  win.chrome.webContents.send('tabChange', index)
  win.chrome.webContents.send('zoomUpdate', asRealTab(tab).webContents.zoomFactor)
    // Zoom is global and changed every time the tab is changed
    // That's because chrome has a same-origin zoom policy.
  //

  asRealTab(tab).webContents.focus();

  setTitleOfWindow(win, asRealTab(tab))
  return tab;
}

export function dividePanes(win: TabWindow, panes: { right: Tab, left: Tab, separatorPosition?: number }) {
  const right = toRealTab(panes.right);
  const left = toRealTab(panes.left);

  if (right.paneView) undividePanes(win, right.paneView)
  if (left.paneView) undividePanes(win, left.paneView)

  const separatorPosition = panes.separatorPosition ?? 0.5;

  const paneView = { rightTab: right, leftTab: left, separatorPosition };

  win.paneViews.push(paneView);

  right.paneView = left.paneView = paneView;

  // If the current tab is a part of the newly created pane view, this display it correctly
  selectTab(win, { tab: win.currentTab })
}

export function undividePanes(win: TabWindow, paneView: PaneView) {
  if (!win.paneViews.includes(paneView)) throw new Error("No PaneView found in window")

  win.paneViews.splice(win.paneViews.indexOf(paneView), 1);

  paneView.leftTab.paneView = paneView.rightTab.paneView = null;
  win.removeBrowserView(paneView.leftTab)
  win.removeBrowserView(paneView.rightTab)

  selectTab(win, { tab: win.currentTab })
}

/**
 * Creates a new tab on `window`
 * 
 * Returns `false` if the tab creation was cancelled by the `createTab` event handler
 */
export function createTab(window: TabWindow, options: TabOptions, createBrowserViewOptions?: CreateBrowserViewOptions): Tab | false {
  if (!emitPreventable('createTab', { win: window, options })) return false;

  let tab: Tab;
  if (options.isGhost) {
    if (!options.uid) {
      let uid = UIDsAmount;
      UIDsAmount++;
      options.uid = uid;
    }
    tab = {
      isGhost: true,
      url: options.url,
      title: options.initialTitle,
      faviconURL: options.initialFavicon,
      uniqueID: options.uid,
      private: options.private,
      isOpenedAtStart: options.isOpenedAtStart,
      owner: window,
      history: [],
      currentHistoryIndex: -1
    }
    tabUniqueIDs[options.uid] = tab;

  } else {
    tab = createBrowserView(options, createBrowserViewOptions);
  }
  setCurrentTabBounds(window, tab) // better to resize here or will slow down the tab switching
  tab.targetFrameName = options.targetFrameName;
  if (!tab.isGhost) attach(window, asRealTab(tab))
  addTab(window, tab, options);
  if (!tab.isGhost) window.chrome.webContents.send('tabUpdate', {
    index: window.tabs.indexOf(tab), state: { isLoading: true }
  })
  options.background || selectTab(window, { tab: tab })
  return tab;
}

const beingClosed: Tab[] = [];
/**
 * Attempts to close the tab. Will return `false` *(or `Promise<false>`)*
 * if the tab wasn't closed either because it's already being closed or it was cancelled by the event handler
 * or because the `beforeunload` event handler prevented the closing of the tab (the user chose to stay)
 * @param keepAlive Whether to prevent the tab from closing and keep the window open if this is the only tab in it.
 * This will cause the function to return `false` *(or `Promise<false>`)* if the tab is the only tab in the window.
 * */
export function closeTab(win: TabWindow, desc: { tab?: Tab, index?: number }, keepAlive?: boolean) {
  if (!desc.tab) desc.tab = win.tabs[desc.index]
  if (!desc.index) desc.index = win.tabs.indexOf(desc.tab)

  if (!emitPreventable('closeTab', { win, tab: desc.tab })) return false;

  function close() {
    beingClosed.splice(beingClosed.indexOf(desc.tab), 1);

    let lastTabGroup = getTabGroupByTab(desc.tab);
    let lastTabGroupID: number;
    if (lastTabGroup) lastTabGroupID = lastTabGroup.id;

    let remResult = removeTab(desc.tab.owner, desc, keepAlive);
    if (!remResult) return false;

    let lastURL: string;
    let lastTitle: string;
    let tab: Tab;

    if (desc.tab.isGhost) {
      lastURL = desc.tab.url
      lastTitle = desc.tab.title || desc.tab.url
      tab = desc.tab;

    } else {
      detach(asRealTab(desc.tab))
      lastURL = asRealTab(desc.tab).webContents.getURL()
      lastTitle = asRealTab(desc.tab).webContents.getTitle()
      tab = destroyWebContents(asRealTab(desc.tab));
    }
    if (tab.private) {
      delete tabUniqueIDs[tab.uniqueID];
      return tab;

    } else {
      win.recentlyClosed.push({
        tab,
        index: desc.index,
        UID: tab.uniqueID,
        lastURL, lastTitle,
        lastTabGroupID
      });
      if (win.recentlyClosed.length > userData.config.get().behaviour.maxRecentTabs) {
        delete tabUniqueIDs[win.recentlyClosed[0].UID];
        win.recentlyClosed.shift();
      }
      return tab;
    }
  }

  if (beingClosed.includes(desc.tab)) {
    console.log(`The tab ${desc.tab?.uniqueID} (#${desc.index}) is already being closed`);
    return false;
  }
  beingClosed.push(desc.tab);

  return desc.tab.isGhost ? close() : handleBeforeUnload(asRealTab(desc.tab).webContents, close);
}

export function openClosedTab(win: TabWindow, index?: number, background: boolean = true) {
  let tabInfo: typeof win.recentlyClosed[0];
  if (win.recentlyClosed.length < 1) return false;
  if (index != undefined) {
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

  tabInfo.tab = createBrowserView(options)

  addTab(win, tabInfo.tab, options)
  attach(win, tabInfo.tab)

  if (tabInfo.lastTabGroupID != undefined) {
    try {
      addTabToGroup(win, getTabGroupByID(tabInfo.lastTabGroupID).group, tabInfo.tab)

    } catch (e) {
      console.log("openClosedTab: Failed to add this tab to its group (non-critical).", e + '');
    }
  }

  return tabInfo.tab;
}

/**
 * @param options
 * * `shouldSelect` (default: `true`) Whether the newly moved tab should be selected
 * * `preventPinning` (default: `false`) If the tab is already pinned and is moved before the
 * `pinnedTabsEndIndex`, whether to prevent its pinning again
 * 
 * Will return `false` if the moving was prevented by the `moveTab` event handler
 */
export function moveTab(
  tab: Tab,
  destination: { window: TabWindow, index: number },
  { shouldSelect = true, preventPinning = false }: { shouldSelect?: boolean, preventPinning?: boolean } = {}
): Tab | false {
  const { window, index } = destination;

  if (!emitPreventable('moveTab', { tab, destination, shouldSelect, preventPinning })) return false;

  if (!tab.owner) throw new Error(`Tab ##${tab.uniqueID} doesn't have an owner and cannot be moved.`);

  if (tab.isGhost) tab = toRealTab(tab);

  let forcePin = false;
  if (
    tab.owner.tabs.indexOf(tab) < tab.owner.pinnedTabsEndIndex &&
    index <= window.pinnedTabsEndIndex &&
    !preventPinning
  ) {
    forcePin = true;
  }

  let { owner } = tab
  removeTab(owner, { tab })
  if (owner != window) {
    detach(asRealTab(tab))
    attach(window, asRealTab(tab))
  }
  addTab(window, tab, {
    url: asRealTab(tab).webContents.getURL(),
    initialFavicon: tab.faviconDataURL,
    private: tab.private,
    position: index,
    uid: tab.uniqueID
  }, { forcePin })

  updateTabState(window, { tab })

  if (shouldSelect) {
    selectTab(window, { tab })
  }
  return tab;
}

export function openUniqueNereidTab(win: TabWindow, page: string, nextToCurrentTab?: boolean, path?: string) {
  if (page.endsWith('/')) {
    page = page.slice(0, -1)
  }

  let oldTab = win.tabs.find(tab =>
    (tab.isGhost ? tab.url : asRealTab(tab).webContents.getURL()).startsWith('nereid://' + page)
  );
  const currentTabIndex = win.tabs.indexOf(win.currentTab);

  if (oldTab) {
    if (
      nextToCurrentTab &&
      win.tabs.indexOf(oldTab) != currentTabIndex &&
      win.tabs.indexOf(oldTab) != currentTabIndex + 1
    ) {
      let moveToIndex = currentTabIndex + 1;
      if (win.tabs.indexOf(oldTab) < currentTabIndex) {
        // when the `oldTab` is moved, it will cause all indexes to decrease
        moveToIndex--;
      }
      // We're assigning to `oldTab` here because it might've been a ghost tab
      oldTab = moveTab(oldTab, { window: win, index: moveToIndex }) || toRealTab(oldTab);

    } else {
      oldTab = selectTab(win, { tab: oldTab }) || toRealTab(oldTab)
    }

    if (
      path != undefined &&
      'nereid://' + page + '/' + path != asRealTab(oldTab).webContents.getURL()
    ) {
      asRealTab(oldTab).webContents.loadURL('nereid://' + page + '/' + path)
    }

  } else {
    createTab(win, {
      url: 'nereid://' + page + '/' + (path ?? ''),
      position: nextToCurrentTab ? currentTabIndex + 1 : null
    })
  }
}


// Every few seconds, lastlaunch should update
let backupIntervalFlag = options.backup_tabs_interval;

setInterval(updateSavedTabs, backupIntervalFlag?.type == 'num' ? backupIntervalFlag.value : 30000)