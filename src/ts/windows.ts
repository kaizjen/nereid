// This file is for all types of windows

import type { TabWindow, TabOptions, Tab, Configuration, Bookmarks, RealTab, ChromeWindow, SingleTabWindow } from "./types";
import { app, BrowserView, BrowserWindow, BrowserWindowConstructorOptions, nativeTheme, screen } from "electron";
import * as tabManager from "./tabs";
import * as _url from "url";
import * as pathModule from "path";
import { bookmarks, config, control, lastlaunch } from './userdata'
import { showAppMenu } from "./menu";
import { INTERNAL_PARTITION } from "./sessions";

const WM_INITMENU = 0x0116; // windows' initmenu, explained later in the code
export const PANE_SEP_WIDTH = 12;
let headHeight = 36; // px, height of the "head" of chrome

export function setHeadHeight(hh: number) {
  if (!platform.windows) return;

  headHeight = hh;
  getAllTabWindows().forEach(w => {
    w.setTitleBarOverlay({
      height: Math.round(headHeight * w.chrome.webContents.zoomFactor)
    })
  })
}

const colors = {
  bg: {
    dark: '#1f2124',
    light: '#b0b4bb'
  },
  fg: {
    dark: '#ffffff',
    light: '#000000'
  }
}

const platform = {
  mac: process.platform == 'darwin',
  windows: process.platform == 'win32',
  linux_BSD: process.platform != 'darwin' && process.platform != 'win32'
}

let windows: TabWindow[] = [];

/** Cache the WCO value so it doesn't have to be computed every time */
let WCO_BOUNDS: { left: number, right: number };

function updateWindowBounds(window: TabWindow) {
  const { x, y, width, height } = window.getBounds()

  lastlaunch.set({
    bounds: {
      x, y, width, height,
      maximized: window.isMaximized()
    }
  });
}
/** Create a base chrome window. **Notice that this window is created HIDDEN by default** */
async function newChromeWindow(
  chromeURL: string,
  overrideBrowserWindowOptions: Partial<BrowserWindowConstructorOptions>
): Promise<ChromeWindow> {
  let w = new BrowserWindow({
    frame: !platform.linux_BSD,
    titleBarOverlay: {
      color: nativeTheme.shouldUseDarkColors ? colors.bg.dark : colors.bg.light,
      symbolColor: nativeTheme.shouldUseDarkColors ? colors.fg.dark : colors.fg.light,
      height: headHeight
    },
    titleBarStyle: platform.windows ? 'hidden' : 'hiddenInset',
    show: false,
    backgroundColor: '#ffffffff',
    icon: pathModule.join(__dirname, `../../icon.${platform.windows ? 'ico' : 'png'}`),

    //width, height, x, y,

    minHeight: 400,
    minWidth: 600,
    webPreferences: {
      preload: `${__dirname}/preloads/internal.js`,
      nodeIntegration: true,
      contextIsolation: false,
      partition: INTERNAL_PARTITION,
    },
    ...overrideBrowserWindowOptions
  }) as ChromeWindow;

  w.chromeHeight = 74; // initial value for chromeHeight if the chrome takes a long time to load

  if (platform.windows) w.hookWindowMessage(WM_INITMENU, (wParam, lParam) => {
    // On Windows the 'system-context-menu' event never fires, so this is the only working solution
    // to display custom context menu
    // thanks, qjl1569 :D (https://github.com/electron/electron/issues/24893#issuecomment-1109262719)
    w.setEnabled(false);
    w.setEnabled(true);
    // voodoo magic to prevent default menu from showing

    showAppMenu();
  })

  w.on('resize', () => {
    // setImmediate is needed so that the contents resize correctly on Linux
    setImmediate(() => {
      let { width, height } = w.getContentBounds()

      // The BrowserView resizes incorrectly when window is resized or maximized/restored (on Windows).
      // That's because w.getBounds() has weird additional 16px of width
      setCurrentTabBounds(w)
      w.chrome.setBounds({ x: 0, y: 0, width, height })
    })
  })
  // Weird visual glith: when maximized the first time, currentTab has some white space at the bottom (??)
  // I have no idea what is going on here, and I have no idea how to fix this

  function reactToThemeChange() {
    if (nativeTheme.shouldUseDarkColors) {
      w.setTitleBarOverlay({
        color: colors.bg.dark,
        symbolColor: colors.fg.dark
      })

    } else {
      w.setTitleBarOverlay({
        color: colors.bg.light,
        symbolColor: colors.fg.light
      })
    }
  }
  if (platform.windows) {
    nativeTheme.on('updated', reactToThemeChange);
  }

  let prevChrZoomFactor: number;
  function onConfigChange(c: Configuration) {
    chromeBV.webContents.send('userData/config', c)

    if (prevChrZoomFactor == c.ui.chromeZoomFactor) return;

    chromeBV.webContents.zoomFactor = c.ui.chromeZoomFactor;

    chromeBV.webContents.send('adjustHeight') // webContents will send a 'chrome.setHeight' message in return.
    prevChrZoomFactor = c.ui.chromeZoomFactor;
  }
  function onBookmarksChange(bms: Bookmarks) {
    chromeBV.webContents.send('userData/bookmarks', bms)
  }
  // these functions are called below

  if (!WCO_BOUNDS) {
    await w.webContents.loadURL('data:text/html,')
    let currentChange = -1;
    w.webContents.on('ipc-message', (_e, _ch, arg) => {
      // This on('ipc-message') is called two times for reliability
      currentChange++;
      const thisChange = currentChange;

      let vars: { left: number, right: number } = JSON.parse(arg);

      function proceed() {
        // Sometimes, the first call to proceed() will be executed after the second on('ipc-message')
        // call, which is more reliable. (The second call to on() is done because of the 'geometrychange' event)
        // Here, we prevent proceed() from running in this case.
        if (thisChange != currentChange) return; // geometrychange has been fired and was already processed
        WCO_BOUNDS = {
          left: vars.left,
          right: w.getContentBounds().width - vars.right
        };
        chromeBV.webContents.send('wco', WCO_BOUNDS)
        console.log('setting WCO bounds:', WCO_BOUNDS, vars, currentChange);

        // immediately crash the original renderer of the window, so it doesnt take any memory.
        w.webContents.forcefullyCrashRenderer();
      }

      if (chromeBV.webContents.isLoading()) {
        chromeBV.webContents.once('did-finish-load', proceed)
      } else proceed()
    })

    await w.webContents.mainFrame.executeJavaScript(`
      function send() {
        nereid.ipcRenderer.send('geometrybegin', JSON.stringify(navigator.windowControlsOverlay.getTitlebarAreaRect()))
      }
      requestAnimationFrame(send)
      navigator.windowControlsOverlay.ongeometrychange = send;
    `);
  }

  // The chrome of Nereid is a BrowserView called `chromeBV`
  let chromeBV = new BrowserView({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      partition: INTERNAL_PARTITION,
      preload: `${__dirname}/preloads/internal.js`
    }
  });
  chromeBV.setBounds({ x: 0, y: 0, width: w.getContentBounds().width, height: w.getContentBounds().height })
  chromeBV.setBackgroundColor('#00000000') // make it transparent
  w.addBrowserView(chromeBV)

  w.chrome = chromeBV;

  await chromeBV.webContents.loadURL(chromeURL)
  if (!app.isPackaged || control.options.open_devtools_for_window?.value) {
    chromeBV.webContents.openDevTools({ mode: 'detach' })
  }

  if (WCO_BOUNDS) {
    chromeBV.webContents.send('wco', WCO_BOUNDS)
  }

  chromeBV.webContents.on('render-process-gone', () => {
    console.log("Chrome process crashed, reloading");
    chromeBV.webContents.reload()
  })

  chromeBV.webContents.on('did-finish-load', async () => {
    console.log("Chrome is ready, sending base window info");

    chromeBV.webContents.send('wco', WCO_BOUNDS)
    onConfigChange(config.get())
    onBookmarksChange(await bookmarks.get())
  })

  chromeBV.webContents.on('focus', () => {
    chromeBV.webContents.send('chromeFocus')
  })
  chromeBV.webContents.on('blur', () => {
    chromeBV.webContents.send('chromeBlur')
  })

  config.listenCall(onConfigChange);
  bookmarks.listenCall(onBookmarksChange);

  w.show();

  w.on('focus', () => chromeBV.webContents.send('focus'))
  w.on('blur', () => chromeBV.webContents.send('blur'))

  w.on('closed', () => {
    // Clean up all the listeners
    nativeTheme.off('updated', reactToThemeChange)
    config.unlisten(onConfigChange);
    bookmarks.unlisten(onBookmarksChange);

    w.chrome.webContents.close();
  })

  return w;
}

export async function newTabWindow(tabOptionsArray: TabOptions[]): Promise<TabWindow> {
  let { width, height, x, y, maximized } = lastlaunch.get().bounds;

  const { bounds: displayBounds } = screen.getDisplayMatching({ width, height, x, y });

  if (
    displayBounds.width < (x + width) ||
    displayBounds.height < (y + height)
  ) {
    width = 1000;
    height = 700;
    x = displayBounds.x;
    y = displayBounds.y;

    console.log("Window is out of bounds, returning it back");
  }

  let w = await newChromeWindow('n-internal://chrome/index.html', { width, height, x, y, }) as TabWindow;

  w.winID = windows.push(w) - 1;
  w.tabs = []; // BrowserViews will be here
  w.tabGroups = [];
  w.pinnedTabsEndIndex = 0;
  w.recentlyClosed = [];

  if (platform.windows) w.hookWindowMessage(WM_INITMENU, (wParam, lParam) => {
    // On Windows the 'system-context-menu' event never fires, so this is the only working solution
    // to display custom context menu
    // thanks, qjl1569 :D (https://github.com/electron/electron/issues/24893#issuecomment-1109262719)
    w.setEnabled(false);
    w.setEnabled(true);
    // voodoo magic to prevent default menu from showing

    showAppMenu();
  })

  // TODO: handle 'beforeunload' events of all tabs
  w.on('close', () => updateWindowBounds(w))

  w.on('closed', () => {
    tabManager.updateSavedTabsImmediately();

    // i don't think browserviews (especially unattached ones) are destroyed when BrowserWindow closes
    w.tabs.forEach(item => {
      if (item.isGhost) return;
      tabManager.detach(tabManager.asRealTab(item));
      tabManager.destroyWebContents(tabManager.asRealTab(item));
    });

    let index = windows.indexOf(w);
    if (index == -1) throw(new Error("This should NOT happen! Window is not in windows[] array!"))

    windows.splice(index, 1) // remove from windows array
  })

  w.chrome.webContents.on('did-finish-load', async () => {
    console.log("Chrome is ready, sending tab info");

    w.tabs.forEach((tab, i) => {
      w.chrome.webContents.send('addTab', {
        position: i,
        private: tab.private,
        uid: tab.uniqueID,
        url: 'nereid://newtab'
      });
      tabManager.updateTabState(w, { tab });
    })

    w.tabGroups.forEach(group => {
      w.chrome.webContents.send('addTabGroup', group)
    })

    w.chrome.webContents.send('tabChange', w.tabs.indexOf(w.currentTab))

    w.chrome.webContents.send('pinnedTabsEndIndexUpdate', w.pinnedTabsEndIndex)
  })

  tabOptionsArray.forEach(tabOptions => {
    tabManager.createTab(w, tabOptions)
  })
  if (maximized) w.maximize()
  w.show();

  return w;
}
export async function newSingleTabWindow(tab: RealTab, windowOptions: Partial<BrowserWindowConstructorOptions> = {}, owner: RealTab) {
  const { bounds: displayBounds } = screen.getPrimaryDisplay();

  if (
    windowOptions.x < 0 || windowOptions.y < 0 ||
    displayBounds.width < ((windowOptions.x || 0) + (windowOptions.width || 0)) ||
    displayBounds.height < ((windowOptions.y || 0) + (windowOptions.height || 0))
  ) {
    windowOptions.width = 1000;
    windowOptions.height = 700;
    windowOptions.x = displayBounds.x;
    windowOptions.y = displayBounds.y;

    console.log("Opened window is out of bounds, returning it back");
  }

  let w = await newChromeWindow('n-internal://chrome/singletab.html', windowOptions) as SingleTabWindow;

  if (!owner.webContents || owner.webContents.isDestroyed() || !owner.owner || owner.owner.isDestroyed()) {
    // This could happen during a race condition when a window opens a pop-up
    // and then immediately closes, before this window could register the listeners.
    // In this case, forcefully close the window.
    w.destroy();
    return w;
  }

  w.winID = windows.push(w) - 1;
  w.tabs = [] as any;
  w.tabGroups = [];
  w.pinnedTabsEndIndex = 0;
  w.recentlyClosed = [];

  w.currentTab = tab;

  w.owner = owner;

  // We store a reference to the window of the owner-tab here because the
  // owner-tab is already detached when the single-tab window is closed
  const grandParent = w.owner.owner;

  tabManager.attach(w, tab);
  tabManager.addTab(w, tab, { url: tab.webContents.getURL() });
  tabManager.updateTabState(w, { tab });
  tabManager.selectTab(w, { index: 0 });

  function handleCreateTab({ win, options, preventDefault }) {
    if (win != w) return;

    preventDefault();
    tabManager.createTab(grandParent, { ...options, position: grandParent.tabs.indexOf(w.owner) + 1 })
  }
  function handleCloseTab({ win, preventDefault }) {
    if (win != w) return;

    preventDefault();
    w.close();
  }
  function handleMoveTab({ destination, preventDefault }) {
    if (destination.window != w) return;
    preventDefault();
  }

  tabManager.tabEvents.on('createTab', handleCreateTab)
  tabManager.tabEvents.on('closeTab', handleCloseTab)
  tabManager.tabEvents.on('moveTab', handleMoveTab)

  w.on('closed', () => {
    windows.splice(windows.indexOf(w), 1);

    if (w.owner) {
      w.owner.childWindow = null;
    }

    if (w.currentTab.owner) {
      // The tab may not have an owner if it was closed using `window.close()`
      tabManager.detach(w.currentTab);
    }
    if (w.currentTab.childWindow) {
      w.currentTab.childWindow.close()
    }

    tabManager.tabEvents.off('createTab', handleCreateTab)
    tabManager.tabEvents.off('closeTab', handleCloseTab)
    tabManager.tabEvents.off('moveTab', handleMoveTab)
  })

  return w;
}

export function getTabWindowByID(id: number) {
  return windows[id]
}

export function getIDOfTabWindow(win: TabWindow) {
  return windows.indexOf(win)
}

export function getAllTabWindows(): TabWindow[] {
  return Object.assign([], windows)
}

export function isTabWindow(win: BrowserWindow): win is TabWindow {
  return windows.includes(win as any)
}

export function setCurrentTabBounds(_win: ChromeWindow, tab?: Tab) {
  // These two are the only examples of ChromeWindows
  const win = _win as TabWindow | SingleTabWindow;

  // The BrowserView resizes incorrectly when window is resized or maximized/restored (on Windows).
  // That's because w.getBounds() has weird additional 16px of width
  const { width, height } = win.getContentBounds()
  let rect: Electron.Rectangle;
  if (win.isFullScreen()) {
    rect = { x: 0, y: 0, width, height }
    win.chrome.webContents.send('paneDividerOnTop', true)

  } else {
    rect = { x: 0, y: win.chromeHeight, width, height: height - win.chromeHeight }
    win.chrome.webContents.send('paneDividerOnTop', false)
  }

  function setBoundsOfTab(tab: RealTab) {
    if (tab.paneView) {
      const leftPane = tab.paneView.leftTab;
      const rightPane = tab.paneView.rightTab;

      const leftRect = { ...rect, width: Math.round(rect.width * tab.paneView.separatorPosition) }
      const rightRect = {
        ...rect,
        width: Math.round(rect.width * (1 - tab.paneView.separatorPosition) - PANE_SEP_WIDTH),
        x: Math.round(rect.width * tab.paneView.separatorPosition + PANE_SEP_WIDTH)
      }

      tabManager.asRealTab(leftPane).setBounds(leftRect)
      tabManager.asRealTab(rightPane).setBounds(rightRect)

      win.chrome.webContents.send('paneDividerPosition', tab.paneView.separatorPosition)

    } else {
      tab.setBounds(rect)
      if (win.currentTab == tab) win.chrome.webContents.send('paneDividerPosition', -0.5)
    }
  }
  if (tab && !tab.isGhost) {
    setBoundsOfTab(tabManager.asRealTab(tab))

  } else if (win.currentTab) {
    setBoundsOfTab(win.currentTab)
  }
}

const defaultOptions: BrowserWindowConstructorOptions = {
  resizable: false, minimizable: false,
  width: 300, height: 500,
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false,
    partition: INTERNAL_PARTITION,
    preload: `${__dirname}/preloads/internal.js`
  }
}
export async function newDialogWindow(
  { type, init = '', options = defaultOptions }:
    { type: 'cookieviewer' | 'certificate', init?: string, options?: BrowserWindowConstructorOptions }
) {
  options = Object.assign({}, defaultOptions, options)
  const w = new BrowserWindow(options);
  w.removeMenu();
  await w.loadURL(`n-internal://${type}/index.html#${init}`);

  w.webContents.on('render-process-gone', () => w.close())

  if (control.options.open_devtools_for_window?.value || !app.isPackaged) {
    w.webContents.openDevTools({ mode: 'detach' })
  }
  return w;
}

type UtilityWindowTypes = 'taskmanager'
const utitlyWindows: Record<UtilityWindowTypes, BrowserWindow> = {
  taskmanager: null,
}
export async function openUtilityWindow(
  { type, init = '', options = defaultOptions }:
    { type: UtilityWindowTypes, init?: string, options?: BrowserWindowConstructorOptions }
) {
  options = Object.assign({}, defaultOptions, options)

  const oldWindow = utitlyWindows[type];
  if (oldWindow) {
    oldWindow.focus();
    return oldWindow;
  }

  const w = new BrowserWindow(options);
  w.removeMenu();
  utitlyWindows[type] = w;

  await w.loadURL(`n-internal://${type}/index.html#${init}`);

  w.webContents.on('render-process-gone', () => w.close())

  w.on('closed', () => {
    utitlyWindows[type] = null;
  })

  if (control.options.open_devtools_for_window?.value || !app.isPackaged) {
    w.webContents.openDevTools({ mode: 'detach' })
  }
  return w;
}