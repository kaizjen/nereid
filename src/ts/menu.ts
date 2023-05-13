// Manages all menu stuff

import { app, clipboard, dialog, ipcMain, Menu, MenuItem, session } from "electron";
import { Bookmark, RealTab, Tab, TabGroup, TabOptions, TabWindow } from "./types";
import { isTabWindow, newTabWindow, setCurrentTabBounds } from './windows'
import { bookmarks, config, control, downloads } from './userdata'
import * as pathModule from "path";
import * as fs from "fs"
import { asRealTab, closeTab, createTab, dividePanes, moveTab, openClosedTab, openUniqueNereidTab, selectTab, setMutedTab, toRealTab, undividePanes } from './tabs'
import $ from './common'
import fetch from "electron-fetch";
import type { Response } from "electron-fetch"
import { DEFAULT_PARTITION, PRIVATE_PARTITION } from "./sessions";
import { t } from "./i18n";
import { kill } from "./process";
import { createTabGroup, getTabGroupByTab, pinTab, removeTabFromGroup, unpinTab } from "./tabgroups";
import { commands } from "./commands";

const lazyLoaded: Function[] = [];
function lazy(fn: () => any[]) {
  const arrayRef = [];

  lazyLoaded.push(() => {
    arrayRef.push(...fn())
  })

  return arrayRef;
}

function appendMenuItems(menu: Menu, items: MenuItem[]) {
  items.forEach(item => {
    menu.append(item)
  })
  return menu;
}

function appendMIConstructors(menu: Menu, items: Electron.MenuItemConstructorOptions[]) {
  items.forEach(constructorOptions => {
    menu.append(new MenuItem(constructorOptions))
  })
  return menu;
}

const hidden = { visible: false };
const clickToTrigger = (_: any, win: Electron.BrowserWindow) => [win] as [Electron.BrowserWindow];

function obtainWebContents(win: Electron.BrowserWindow | TabWindow) {
  return isTabWindow(win) ? win.currentTab.webContents : win.webContents
}

function zoom(direction: 'in' | 'out') {
  return function (_, win) {
    let wc = obtainWebContents(win)
    wc.emit('zoom-changed', {}, direction)
  }
}

async function exists(path: string) {
  try {
    await fs.promises.access(path);
    return true;

  } catch (e) {
    return false;
  }
}

function toggleDevTools(wc: Electron.WebContents) {
  if (wc.isDevToolsOpened()) {
    wc.closeDevTools();

  } else {
    // TODO: remebmer the last state of DevTools, instead of forcing 'bottom'. How do we get the state though?
    wc.openDevTools({ mode: 'bottom' })
  }
}

function focusChrome(win: TabWindow) {
  win.chrome.webContents.focus()
}

const SEPARATOR: Electron.MenuItemConstructorOptions = {
  type: 'separator'
}

const SEPARATOR_ITEM = new MenuItem(SEPARATOR);

// We lazy-load these two because the `toAppMenuItem()` function requires
// the buildAppMenu() to be exported, and it isn't yet.
// (Remember, Electron uses cjs modules!)
const newTabInPanes: MenuItem[] = lazy(() => [
  commands.newTabInLeftPane.toAppMenuItem(clickToTrigger),
  commands.newTabInRightPane.toAppMenuItem(clickToTrigger),
])
const openNearbyTabsInPanes: Electron.MenuItemConstructorOptions[] = lazy(() => [
  {
    label: t('menu.tabs.openLeftTabIn'),
    submenu: appendMenuItems(new Menu(), [
      commands.leftTabInLeftPane.toAppMenuItem({ label: t('menu.tabs.openTabIn.leftPane') }, clickToTrigger),
      commands.leftTabInRightPane.toAppMenuItem({ label: t('menu.tabs.openTabIn.rightPane') }, clickToTrigger)
    ])
  },
  {
    label: t('menu.tabs.openRightTabIn'),
    submenu: appendMenuItems(new Menu(), [
      commands.rightTabInLeftPane.toAppMenuItem({ label: t('menu.tabs.openTabIn.leftPane') }, clickToTrigger),
      commands.rightTabInRightPane.toAppMenuItem({ label: t('menu.tabs.openTabIn.rightPane') }, clickToTrigger)
    ])
  }
])

const viewItems: Electron.MenuItemConstructorOptions[] = [
  {
    label: t('menu.zoom.in'),
    accelerator: 'CmdOrCtrl+numadd',
    registerAccelerator: false, // alredy registered
    click: zoom('in')
  },
  {
    label: t('menu.zoom.out'),
    accelerator: 'CmdOrCtrl+-',
    registerAccelerator: false, // alredy registered
    click: zoom('out')
  },
  {
    label: t('menu.zoom.0'),
    accelerator: 'CmdOrCtrl+num0',
    click(_m, win) {
      if (!isTabWindow(win)) return;

      win.currentTab.webContents.zoomFactor = config.get().ui.defaultZoomFactor;
      win.chrome.webContents.send('zoomUpdate', win.currentTab.webContents.zoomFactor)
    }
  }
]
const menuSelectTabF = (index: number): Electron.MenuItemConstructorOptions => ({
  label: `tab-${index}-hidden`,
  accelerator: `CmdOrCtrl+${index}`,
  visible: false,
  click(_, win) {
    const realIndex = index - 1; // 1 on the keyboard corresponds to the 0th tab

    if (!isTabWindow(win)) return;
    if (!win.tabs[realIndex]) return;

    selectTab(win, { index: realIndex });
  }
})

export let appMenu: Menu;

export function buildAppMenu() {
  const nereidMenu = new Menu();

  nereidMenu.append(commands.openAbout.toAppMenuItem(clickToTrigger));
  nereidMenu.append(commands.openSettings.toAppMenuItem(clickToTrigger));
  if (process.platform == 'darwin') {
    appendMIConstructors(nereidMenu, [
      SEPARATOR,
      {
        label: t('menu.hide'),
        role: 'hide' as const
      },
      {
        label: t('menu.hideOthers'),
        role: 'hideOthers' as const
      },
      {
        label: t('menu.unhide'),
        role: 'unhide' as const
      },
      SEPARATOR,
      {
        label: t('menu.services'),
        role: 'services' as const
      },
      SEPARATOR
    ])
  }
  nereidMenu.append(commands.quit.toAppMenuItem())
  // Hidden items
  appendMIConstructors(nereidMenu, [
    {
      label: 'devtools-hidden',
      accelerator: 'F12',
      click(_, win) {
        let wc = obtainWebContents(win)
        toggleDevTools(wc)
      },
      visible: false
    },
    {
      label: 'zoomin-num-hidden',
      accelerator: 'CmdOrCtrl+numadd',
      click: zoom('in'),
      visible: false
    },
    {
      label: 'zoomin-std-eq-hidden',
      // when you press the plus not on the numpad, but on the other keyboard, you actually press the equal sign!
      accelerator: 'CmdOrCtrl+=',
      click: zoom('in'),
      visible: false
    },
    {
      label: 'zoomin-std-plus-hidden',
      accelerator: 'CmdOrCtrl++',
      click: zoom('in'),
      visible: false
    },
    {
      label: 'zoomout-num-hidden',
      accelerator: 'CmdOrCtrl+numsub',
      click: zoom('out'),
      visible: false
    },
    {
      label: 'zoomout-std-hidden',
      accelerator: 'CmdOrCtrl+-',
      click: zoom('out'),
      visible: false
    },
    {
      label: "f5-reload-hidden",
      visible: false,
      accelerator: "F5",
      click(_, win) {
        let wc = obtainWebContents(win)
        wc.reload()
      }
    },
    {
      label: 'esc-exit-fullscreen-hidden',
      visible: false,
      accelerator: 'Escape',
      click(_, win) {
        if (!isTabWindow(win)) return;

        win.setFullScreen(false);
        setCurrentTabBounds(win);
      }
    },
    menuSelectTabF(1),
    menuSelectTabF(2),
    menuSelectTabF(3),
    menuSelectTabF(4),
    menuSelectTabF(5),
    menuSelectTabF(6),
    menuSelectTabF(7),
    menuSelectTabF(8),
    menuSelectTabF(9),
    {
      label: 'tab-last-hidden',
      visible: false,
      accelerator: 'CmdOrCtrl+0',
      click(_, win) {
        if (!isTabWindow(win)) return;

        selectTab(win, { index: win.tabs.length - 1 })
      }
    },
    // TODO: maybe register them as commands?
    {
      label: 'pane-right-hidden',
      visible: false,
      accelerator: 'CmdOrCtrl+.',
      click(_, win) {
        if (!isTabWindow(win)) return;
        if (!win.currentPaneView) return;

        selectTab(win, { tab: win.currentPaneView.rightTab })
      }
    },
    {
      label: 'pane-left-hidden',
      visible: false,
      accelerator: 'CmdOrCtrl+,',
      click(_, win) {
        if (!isTabWindow(win)) return;
        if (!win.currentPaneView) return;

        selectTab(win, { tab: win.currentPaneView.leftTab })
      }
    }
  ])
  nereidMenu.append(commands.swapPanes.toAppMenuItem(hidden, clickToTrigger))
  nereidMenu.append(commands.nextTab.toAppMenuItem(hidden, clickToTrigger))
  nereidMenu.append(commands.previousTab.toAppMenuItem(hidden, clickToTrigger))
  nereidMenu.append(commands.reloadAll.toAppMenuItem(hidden, clickToTrigger))


  const fileMenu = new Menu();
  fileMenu.append(commands.newTab.toAppMenuItem(clickToTrigger))
  fileMenu.append(commands.newPrivateTab.toAppMenuItem(clickToTrigger))
  fileMenu.append(SEPARATOR_ITEM);
  appendMenuItems(fileMenu, newTabInPanes)
  fileMenu.append(SEPARATOR_ITEM);
  fileMenu.append(commands.closePanes.toAppMenuItem(clickToTrigger))
  fileMenu.append(commands.closeTab.toAppMenuItem(clickToTrigger))
  fileMenu.append(commands.openClosed.toAppMenuItem(clickToTrigger))
  fileMenu.append(SEPARATOR_ITEM);
  fileMenu.append(commands.newWindow.toAppMenuItem())
  fileMenu.append(commands.openFile.toAppMenuItem(clickToTrigger))
  fileMenu.append(commands.closeWindow.toAppMenuItem(clickToTrigger))


  const editMenu = Menu.buildFromTemplate([
    { label: t('menu.contextMenu.undo'), role: 'undo', accelerator: 'CmdOrCtrl+Z' },
    { label: t('menu.contextMenu.redo'), role: 'redo', accelerator: 'CmdOrCtrl+Y' },
    SEPARATOR,
    { label: t('menu.contextMenu.cut'), role: 'cut', accelerator: 'CmdOrCtrl+X' },
    { label: t('menu.contextMenu.copy'), role: 'copy', accelerator: 'CmdOrCtrl+C' },
    { label: t('menu.contextMenu.paste'), role: 'paste', accelerator: 'CmdOrCtrl+V' },
    { label: t('menu.contextMenu.pasteAndMatchStyle'), role: 'pasteAndMatchStyle', accelerator: 'CmdOrCtrl+Shift+V' },
    { label: t('menu.contextMenu.delete'), role: 'delete', accelerator: 'Delete' },
    { label: t('menu.contextMenu.selectAll'), role: 'selectAll', accelerator: 'CmdOrCtrl+A' }
  ]);
  editMenu.append(commands.findInPage.toAppMenuItem(clickToTrigger))
  if (app.isEmojiPanelSupported()) {
    appendMIConstructors(editMenu, [
      SEPARATOR,
      {
        label: t('menu.emojiPanel'),
        accelerator: 'Meta+.',
        registerAccelerator: false,
        click() {
          app.showEmojiPanel();
        }
      }
    ])
  }


  const viewMenu = new Menu();
  viewMenu.append(commands.fullscreen.toAppMenuItem(clickToTrigger))
  appendMIConstructors(viewMenu, viewItems)


  const toolsMenu = new Menu();
  toolsMenu.append(commands.openHistory.toAppMenuItem(clickToTrigger))
  toolsMenu.append(commands.openDownloads.toAppMenuItem(clickToTrigger))
  toolsMenu.append(commands.openBookmarks.toAppMenuItem(clickToTrigger))
  toolsMenu.append(commands.openSettings.toAppMenuItem(clickToTrigger))
  toolsMenu.append(SEPARATOR_ITEM)
  toolsMenu.append(commands.toggleDevTools.toAppMenuItem(clickToTrigger))
  toolsMenu.append(commands.taskMgr.toAppMenuItem())


  const tabMenu = new Menu();
  tabMenu.append(commands.reload.toAppMenuItem(clickToTrigger))
  tabMenu.append(commands.hardReload.toAppMenuItem(clickToTrigger))
  tabMenu.append(commands.onePageUp.toAppMenuItem(clickToTrigger))
  appendMenuItems(tabMenu, newTabInPanes)
  appendMIConstructors(tabMenu, openNearbyTabsInPanes)
  fileMenu.append(commands.closePanes.toAppMenuItem(clickToTrigger))
  fileMenu.append(commands.closeTab.toAppMenuItem(clickToTrigger))


  const winMenu = Menu.buildFromTemplate([
    { role: 'minimize' },
    {
      label: t('menu.window.maximize') + '/' + t('menu.window.unmaximize'),
      click(_m, win) {
        if (win.isMaximized()) win.unmaximize()
        else win.maximize()
      }
    }
  ]);
  winMenu.append(commands.closeWindow.toAppMenuItem(clickToTrigger))


  appMenu = Menu.buildFromTemplate([
    {
      label: t('name'),
      submenu: nereidMenu
    },
    {
      label: t('menu.appMenu.file'),
      submenu: fileMenu
    },
    {
      label: t('menu.appMenu.edit'),
      submenu: editMenu
    },
    {
      label: t('menu.appMenu.view'),
      submenu: viewMenu
    },
    {
      label: t('menu.tools'),
      submenu: toolsMenu
    },
    {
      label: t('menu.appMenu.tab'),
      submenu: tabMenu
    },
    {
      label: t('menu.appMenu.window'),
      submenu: winMenu
    }
  ])
  Menu.setApplicationMenu(appMenu)
}

// Block to scope all the variables
{
  const len = lazyLoaded.length;
  let i = -1;
  while (++i < len) {
    lazyLoaded.pop()();
  }
}
buildAppMenu();

export function showAppMenu() {
  Menu.getApplicationMenu().popup();
}

export async function displayOptions(win: TabWindow, { x, y }) {
  let multiplier = config.get().ui.chromeZoomFactor;

  const menu = new Menu();
  menu.append(commands.newTab.toMenuItem(clickToTrigger))
  menu.append(commands.newPrivateTab.toMenuItem(clickToTrigger))
  menu.append(SEPARATOR_ITEM)
  appendMenuItems(menu, newTabInPanes)
  menu.append(SEPARATOR_ITEM)
  menu.append(commands.closePanes.toMenuItem(clickToTrigger))
  menu.append(commands.closeTab.toMenuItem(clickToTrigger))
  menu.append(commands.openClosed.toMenuItem(clickToTrigger))
  menu.append(SEPARATOR_ITEM)
  menu.append(commands.newWindow.toMenuItem())
  menu.append(commands.openFile.toMenuItem(clickToTrigger))
  menu.append(commands.closeWindow.toMenuItem(clickToTrigger))
  menu.append(SEPARATOR_ITEM)
  menu.append(commands.findInPage.toMenuItem(clickToTrigger))
  menu.append(SEPARATOR_ITEM)
  menu.append(commands.fullscreen.toMenuItem(clickToTrigger))
  appendMIConstructors(menu, viewItems)
  menu.append(new MenuItem({
    label: t('menu.zoom.info', { zoom: win.currentTab.webContents.zoomFactor * 100 }),
    enabled: false
  }))
  menu.append(SEPARATOR_ITEM)
    const historyMenu = new Menu();
    historyMenu.append(commands.openHistory.toMenuItem(clickToTrigger))
    appendMIConstructors(historyMenu, [
      {
        label: t('menu.recentlyClosedTabs'),
        enabled: false
      },
      ...win.recentlyClosed.map((tab, i) => ({
        label: tab.lastTitle,
        sublabel: tab.lastURL,
        click() {
          console.log('oct', win.recentlyClosed, i, tab);
          openClosedTab(win, i)
        }
      })).reverse()
    ])
  menu.append(new MenuItem({ label: t('common.history'), submenu: historyMenu }))
  menu.append(commands.openDownloads.toMenuItem(clickToTrigger))
  menu.append(commands.openBookmarks.toMenuItem(clickToTrigger))
  menu.append(commands.openSettings.toMenuItem(clickToTrigger))
  menu.append(SEPARATOR_ITEM)
  menu.append(commands.quit.toMenuItem())

  x = Math.round(x * multiplier);
  y = Math.round(y * multiplier);
  // if i dont multiply these by chromeZoomFactor, the menu will be way off
  // i think it's caused by the Menu.popup(), because, unlike BrowserView.setBounds() it doesn't automatically adjust for the zoom factor
  // (which makes sense, since it's not the zoom factor of the window, but the zoom factor of a BrowserView on top of it)

  menu.popup({ x, y, window: win });
  menu.on('menu-will-close', () => {
    // sending the input event so the chrome will update its styles and the button won't stay 'hovered'
    // basically if we don't update the thing, chrome's webContents will think the mouse is still hovering over the menu button
    win.chrome.webContents.sendInputEvent({
      type: 'mouseMove',
      x: 0, y: 0
    })
  })
}

function createContextTabF(win: TabWindow, tab: Tab) {
  return function createContextTab(opts: TabOptions) {
    if (!win) return;

    const group = getTabGroupByTab(tab);
    let groupID = null;
    if (group) groupID = group.id;

    return createTab(win, Object.assign({
      private: tab.private,
      position: win.tabs.indexOf(tab) + 1 || win.tabs.length,
      groupID
    }, opts))
  }
}

export async function showContextMenu(win: TabWindow, tab: RealTab, opts: Electron.ContextMenuParams) {
  const createContextTab = createContextTabF(win, tab)

  let menu = new Menu();

  function addItem(obj: Electron.MenuItemConstructorOptions) {
    menu.append(new MenuItem(obj))
  }
  /**
   * Wrapper around the t(), adds "menu.contextMenu"
   */
  function $t(str: string, obj?: {}) {
    return t(`menu.contextMenu.${str}`, obj)
  }

  /** Executes code on the selected element, with variable `element` pointing to it.
   * Bypasses iframes and open shadow roots, but fails on closed ones. */
  async function executeCodeOnElement(frame: Electron.WebFrameMain, code: string) {
    let x = opts.x;
    let y = opts.y;
    if (frame != frame.top && frame.top != null) {
      // x & y in the string code are the absolute coordinates of the ctx menu;
      // we subtract the starting coords of the iframe to get the coordinates relative to the iframe's document.
      let { newX, newY } = await executeCodeOnElement(frame.top, `(function(){
        const { x: iframeX, y: iframeY } = element.getBoundingClientRect();
        return { newX: x - iframeX, newY: y - iframeY }
      })()`) as any
      x = newX;
      y = newY;
    }
    return await frame.executeJavaScript(`(function(){
      const x = ${x};
      const y = ${y};
      function findElement(root) {
        const element = root.elementFromPoint(x, y);

        if (element.shadowRoot) {
          findElement(element.shadowRoot)

        } else {
          return ${code}
        }
      }
      return findElement(document)
    })()`)
  }

  if (opts.altText) {
    addItem({ label: opts.altText, enabled: false })
    addItem(SEPARATOR)
  }

  if (opts.selectionText) {
    let searchConfig = config.get().search;
    let selectedSE = searchConfig.available[searchConfig.selectedIndex]

    if ($.isValidURL(opts.selectionText)) {
      let linkText = opts.selectionText;

      if (
        !linkText.startsWith('http:') &&
        !linkText.startsWith('https:') &&
        !linkText.startsWith('nereid:') &&
        !linkText.startsWith('chrome:')
      ) {
        linkText = `http://${linkText}`
      }

      addItem({
        label: $t('openLink'), sublabel: linkText,
        click() {
          createContextTab({ url: linkText })
        }
      })
    }
    addItem({ label: $t('search', { engine: selectedSE.name }), click() {
      createContextTab({ url: selectedSE.searchURL.replaceAll('%s', encodeURIComponent(opts.selectionText)) })
    } })
    addItem({ label: $t('copy'), role: 'copy', accelerator: 'CmdOrCtrl+C' })
    if (opts.editFlags.canCut) {
      addItem({ label: $t('cut'), role: 'cut', accelerator: 'CmdOrCtrl+X' })
    }
    if (opts.editFlags.canDelete) {
      addItem({ label: $t('delete'), role: 'delete', accelerator: 'Delete' })
    }
    addItem(SEPARATOR)
  }
  if (opts.editFlags.canPaste) {
    addItem({ label: $t('paste'), role: 'paste', accelerator: 'CmdOrCtrl+V' })
    addItem({ label: $t('pasteAndMatchStyle'), role: 'pasteAndMatchStyle', accelerator: 'CmdOrCtrl+Shift+V' })
    addItem(SEPARATOR)
  }

  if (opts.linkURL) {
    addItem({ label: $t('open.newTab'), click() { createContextTab({ url: opts.linkURL }) } })
    addItem({ label: $t('open.newPrivateTab'), click() { createContextTab({ url: opts.linkURL, private: true }) } })
    addItem({ label: $t('open.newWindow'), click() { newTabWindow([{ url: opts.linkURL, private: tab.private }]) } })
    addItem({ label: $t('open.thisTab'), click() { tab.webContents.loadURL(opts.linkURL) } })
    addItem(SEPARATOR)
    addItem({ label: $t('open.leftPane'), click() {
      const newTab = createContextTab({ url: opts.linkURL, background: true })
      if (newTab) dividePanes(win, { left: newTab, right: tab })
    } })
    addItem({ label: $t('open.rightPane'), click() {
      const newTab = createContextTab({ url: opts.linkURL, background: true })
      if (newTab) dividePanes(win, { left: tab, right: newTab })
    } })
    addItem(SEPARATOR)
    addItem({ label: $t('copyLink'), click() { clipboard.writeText(opts.linkURL) } })

    addItem(SEPARATOR)
  }

  if (opts.mediaType == 'image') {
    if (opts.srcURL) {
      addItem({ label: $t('image.viewInNewTab'), click() { createContextTab({ url: opts.srcURL }) } })
      addItem({ label: $t('image.copyURL'), click() { clipboard.writeText(opts.srcURL) } })
      addItem(SEPARATOR)
    }
    addItem({ label: $t('image.saveAs'), async click() {
      let response: Response;
      try {
        response = await fetch(opts.srcURL, {
          session: session.fromPartition(tab.private ? PRIVATE_PARTITION : DEFAULT_PARTITION),
          useSessionCookies: true
        });
        // Unfortunately, the image will be fetched again, and if the server retrns another image, then oops.
        // There's probably a way to do this with clipboard, but it's too messy even for me.

      } catch (e) {
        console.error(`Fetching image failed:`, e);
        dialog.showErrorBox($t('image.saving.error-title'), `Error: ${e}.`)
        return;
      }

      let contentType = response.headers.get('content-type') ?? '';
      let extension = contentType.slice(6) || pathModule.extname(opts.srcURL).slice(1);

      if (extension == '' || (contentType && !contentType.startsWith('image'))) {
        // maybe don't throw here?
        console.error(`Content-Type is not an image, or the image has no extension`);
        dialog.showErrorBox($t('image.saving.error-title'), $t('image.saving.error-notAnImage'))
        return;
      }

      let result = await dialog.showSaveDialog(win || null, {
        title: $t('image.saving.dialog'),
        properties: ['showHiddenFiles', 'createDirectory'],
        defaultPath: pathModule.join(config.get().behaviour.downloadPath || app.getPath('downloads'), `image.${extension}`)
      });

      if (result.canceled) return;

      if (!response.ok) {
        console.error(`Fetching image failed: ${response.statusText} (${response.status})`);
        dialog.showErrorBox($t('image.saving.error-title'), `Failed: ${response.status} - ${response.statusText}`)
        return;
      }

      let buf = await response.buffer();

      if (await exists(result.filePath)) {
        console.error(`Saving image failed: File with that name already exists`);
        dialog.showErrorBox($t('image.saving.error-title'), $t('image.saving.error-alreadyExists'))
        return;

      } else {
        await fs.promises.writeFile(result.filePath, buf);
        let dlData = await downloads.get();
        dlData.unshift({
          url: opts.srcURL,
          urlChain: [ opts.srcURL ],
          savePath: result.filePath,
          status: 'completed',
          offset: buf.byteLength,
          length: buf.byteLength
        })
        await downloads.set(dlData)
      }

    } })
    addItem({ label: $t('image.copy'), click() { tab.webContents.copyImageAt(opts.x, opts.y) } })
    addItem(SEPARATOR)
  }

  if (opts.mediaType == 'audio' || opts.mediaType == 'video') {
    addItem({ label: $t('media.' + (opts.mediaFlags.isPaused ? 'play' : 'pause')), click() {
      executeCodeOnElement(
        opts.frame,
        opts.mediaFlags.isPaused ? `element.play()` : `element.pause()`
      )
    } })
    addItem({ label: $t('media.mute'), type: 'checkbox', checked: opts.mediaFlags.isMuted, click() {
      executeCodeOnElement(opts.frame, `element.muted = ${opts.mediaFlags.isMuted ? 'false' : 'true'}`)
    }, enabled: opts.mediaFlags.hasAudio })
    addItem({ label: $t('media.loop'), type: 'checkbox', checked: opts.mediaFlags.isLooping, click() {
      executeCodeOnElement(opts.frame, `element.loop = ${opts.mediaFlags.isLooping ? 'false' : 'true'}`)
    }, enabled: opts.mediaFlags.canLoop })
    if (opts.srcURL) {
      addItem(SEPARATOR)
      addItem({ label: $t('media.viewInNewTab'), click() {
        createContextTab({ url: opts.srcURL })
      } })
      addItem({ label: $t('media.copyURL'), click() {
        clipboard.writeText(opts.srcURL)
      } })
    }
    addItem(SEPARATOR)
  }

  if (opts.mediaType == 'video') {
    addItem({ label: $t('media.controls'), type: 'checkbox', checked: opts.mediaFlags.isControlsVisible, click() {
      executeCodeOnElement(opts.frame, `element.controls = ${opts.mediaFlags.isControlsVisible ? 'false' : 'true'}`)
    }, enabled: opts.mediaFlags.canToggleControls })

    if (opts.mediaFlags.canShowPictureInPicture) {
      addItem({ label: $t('media.pictureInPicture'), type: 'checkbox', checked: opts.mediaFlags.isShowingPictureInPicture, click() {
        executeCodeOnElement(
          opts.frame,
          opts.mediaFlags.isShowingPictureInPicture ? 'document.exitPictureInPicture()' : 'element.requestPictureInPicture()'
        )
      } })
    }
    addItem(SEPARATOR)
  }

  if (opts.frame != tab.webContents.mainFrame) {
    addItem({ label: $t('frame.reload'), click() { opts.frame.reload() } })
    addItem({ label: $t('frame.viewSourceCode'), click() {
      createContextTab({ url: `view-source:${opts.frame.url}` })
    } })
    addItem(SEPARATOR)
  }

  addItem({ label: t('navigation.back'), enabled: tab.webContents.canGoBack(), click() { tab.webContents.goBack() } })
  addItem({ label: t('navigation.forward'), enabled: tab.webContents.canGoForward(), click() { tab.webContents.goForward() } })
  addItem({ label: t('navigation.reload'), click() { tab.webContents.reload() } })
  addItem(SEPARATOR)
  addItem({ label: $t('savePageAs'), async click() {
    let result = await dialog.showSaveDialog(win || null, {
      title: $t('savePage_dialog', { page: tab.webContents.getURL() }),
      properties: [ 'showHiddenFiles', 'createDirectory' ],
      defaultPath: pathModule.join(config.get().behaviour.downloadPath || '/', opts.suggestedFilename || 'page'),
      filters: [ { extensions: ['html', 'htm'], name: 'HTML documents' } ]
    });

    if (result.canceled) return;

    let pageType = control.options.save_complete_page.value ? "HTMLComplete" as const : "HTMLOnly" as const
    tab.webContents.savePage(result.filePath, pageType)

  }, accelerator: 'Ctrl+S' })
  addItem({ label: $t('print'), click() {
    // TODO: print page
    dialog.showErrorBox("Not implemented", "Not implemented")
  }, accelerator: 'Ctrl+Shift+P' })
  addItem(SEPARATOR)
  addItem({ label: $t('viewSourceCode'), click() { createContextTab({ url: `view-source:${tab.webContents.getURL()}` }) } })
  addItem({ label: $t('openDevTools'), click() { toggleDevTools(tab.webContents) }, accelerator: 'Ctrl+Shift+I' })
  if (tab.paneView) {
    addItem(SEPARATOR)
    addItem({ label: $t('closePane'), click() {
      if (tab == tab.paneView.leftTab) {
        selectTab(win, { tab: tab.paneView.rightTab })

      } else {
        selectTab(win, { tab: tab.paneView.leftTab })
      }
      undividePanes(win, tab.paneView);
    } })
  }

  menu.popup()
}

export function menuOfAddressBar(win: TabWindow, opts: { selectionText: string }) {
  let menu = new Menu();

  function addItem(obj: Electron.MenuItemConstructorOptions) {
    menu.append(new MenuItem(obj))
  }
  /**
   * Wrapper around the t(), adds "menu.contextMenu"
   */
  function $t(str: string, obj?: {}) {
    return t(`menu.contextMenu.${str}`, obj)
  }

  if (opts.selectionText) {
    let searchConfig = config.get().search;
    let selectedSE = searchConfig.available[searchConfig.selectedIndex]
    addItem({
      label: $t('search', { engine: selectedSE.name }), click() {
        createTab(win, { url: selectedSE.searchURL.replaceAll('%s', encodeURIComponent(opts.selectionText)) })
      }
    })
    addItem({ label: $t('copy'), role: 'copy', accelerator: 'CmdOrCtrl+C' })
    addItem({ label: $t('cut'), role: 'cut', accelerator: 'CmdOrCtrl+X' })
    addItem({ label: $t('delete'), role: 'delete', accelerator: 'Delete' })
    addItem(SEPARATOR)
  }
  addItem({ label: $t('paste'), role: 'paste', accelerator: 'CmdOrCtrl+V' })
  addItem({ label: $t('pasteAndMatchStyle'), role: 'pasteAndMatchStyle', accelerator: 'CmdOrCtrl+Shift+V' })
  const copied = clipboard.readText();
  if (copied) {
    addItem(SEPARATOR)
    addItem({
      label: $t($.isValidURL(copied) ? 'pasteAndGo' : 'pasteAndSearch', { query: copied }),
      accelerator: 'CmdOrCtrl+Shift+V',
      click() {
        win.currentTab.webContents.focus();
        // TODO: stop using ipcMain.emit and switch to something
        // more versatile
        ipcMain.emit('currentTab.go', { sender: win.chrome.webContents }, copied)
      }
    })
  }

  if (menu.items.length == 0) return;

  menu.popup();
}

export function menuOfTab(win: TabWindow, tab: Tab) {
  const createContextTab = createContextTabF(win, tab)

  let menu = new Menu();
  function addItem(options: Electron.MenuItemConstructorOptions) {
    menu.append(new MenuItem(options))
  }

  function $t(str: string, obj?: {}) {
    return t(`menu.tabMenu.${str}`, obj)
  }

  addItem({ label: $t('createNewTab'), accelerator: commands.newTab.accelerator, click() {
    createContextTab({
      private: false,
      url: $.newTabUrl
    })
    focusChrome(win)
  } })
  addItem({ label: $t('createNewPrivateTab'), accelerator: commands.newPrivateTab.accelerator, click() {
    createContextTab({ url: 'nereid://private', private: true })
    focusChrome(win)
  } })
  addItem(SEPARATOR)
  addItem({ label: t('navigation.reload'), click() { toRealTab(tab).webContents.reload() } })
  menu.append(commands.reloadAll.toMenuItem(clickToTrigger))
  addItem({ label: $t('copyURL'), click() { toRealTab(tab).webContents.getURL() } })
  addItem(SEPARATOR)
  addItem({ label: $t('duplicate'), click() {
    createContextTab({
      url: tab.isGhost ? tab.url : asRealTab(tab).webContents.getURL()
    })
  } })
  if (win.tabs.indexOf(tab) < win.pinnedTabsEndIndex) {
    addItem({ label: $t('unpin'), click() { unpinTab(win, tab) } })

  } else {
    addItem({ label: $t('pin'), click() { pinTab(win, tab) } })
  }
  if (!tab.isGhost && asRealTab(tab).webContents.audioMuted) {
    addItem({ label: $t('sound-unmute'), click() { setMutedTab(win, tab, false) } })

  } else {
    addItem({ label: $t('sound-mute'), click() { setMutedTab(win, tab, true) } })
  }
  addItem(SEPARATOR)
  if (getTabGroupByTab(tab)) {
    addItem({ label: $t('removeFromGroup'), click() {
      removeTabFromGroup(win, getTabGroupByTab(tab) as TabGroup, tab);
    } })

  } else {
    addItem({ label: $t('addToNewGroup'), click() {
      createTabGroup(win, {
        startIndex: win.tabs.indexOf(tab),
        endIndex: win.tabs.indexOf(tab) + 1,
        name: '',
        color: 'gray'
      })
    } })
  }
  addItem(SEPARATOR)
  if (tab == win.currentTab) {
    openNearbyTabsInPanes.forEach(item => {
      addItem(item)
    })

  } else {
    addItem({ label: $t('splitPaneLeft'), click() {
      dividePanes(win, { left: tab, right: win.currentTab })
    } })
    addItem({ label: $t('splitPaneRight'), click() {
      dividePanes(win, { left: win.currentTab, right: tab })
    } })
  }
  addItem(SEPARATOR)
  addItem({ label: $t('openInNewWindow'), async click() {
    const window = await newTabWindow([]);
    moveTab(tab, { window, index: 0 })
  } })
  addItem(SEPARATOR)
  addItem({
    label: $t('close-this'), accelerator: commands.closeTab.accelerator, async click() {
      try {
        await closeTab(win, { tab }, true)

      } catch (e) {
        console.error('Menu item "Close tab" - error:', e)
      }
    }
  })
  addItem({
    label: $t('close-others'), click() {
      win.tabs.forEach(async otherTab => {
        if (otherTab == tab) return;

        try {
          await closeTab(win, { tab: otherTab }, true)

        } catch (e) {
          console.error('Menu item "Close other tabs" - error:', e)
        }
      })
    }
  })
  addItem({
    label: $t('close-right'), async click() {
      let index = win.tabs.indexOf(tab);
      if (index == -1) console.error('Menu item "Close tabs to the right" - no tab found in window');

      while (win.tabs[index + 1]) {
        await closeTab(win, { index: index + 1 }, true)
      }
    }
  })

  menu.popup()
}

export function menuNewTab(win: TabWindow, group?: TabGroup) {
  function $t(str: string, obj?: {}) {
    return t(`menu.tabMenu.${str}`, obj)
  }

  Menu.buildFromTemplate([
    {
      label: $t('createNewTab'),
      accelerator: commands.newTab.accelerator,
      click() {
        createTab(win, { url: $.newTabUrl, groupID: group?.id })
        focusChrome(win)
      }
    },
    {
      label: $t('createNewPrivateTab'),
      accelerator: commands.newPrivateTab.accelerator,
      click() {
        createTab(win, { url: 'nereid://private', private: true, groupID: group?.id })
        focusChrome(win)
      }
    },
  ]).popup()
}

export function menuOfBookmark(win: TabWindow, bookmark: Bookmark, index: number) {
  let menu = new Menu();
  function addItem(options: Electron.MenuItemConstructorOptions) {
    menu.append(new MenuItem(options));
  }

  function t_menu(str: string, obj?: {}) {
    return t(`menu.contextMenu.${str}`, obj)
  }
  function t_bar(str: string, obj?: {}) {
    return t(`ui.bookmarkBar.${str}`, obj)
  }

  addItem({
    label: t_menu('copyLink'),
    sublabel: bookmark.url,
    click() {
      clipboard.writeText(bookmark.url)
    }
  })
  addItem(SEPARATOR)
  addItem({
    label: t_menu('open.newTab'),
    click() {
      createTab(win, { url: bookmark.url })
    }
  })
  addItem({
    label: t_menu('open.newPrivateTab'),
    click() {
      createTab(win, { url: bookmark.url, private: true })
    }
  })
  addItem({
    label: t_menu('open.newWindow'),
    click() {
      newTabWindow([{ url: bookmark.url }])
    }
  })
  addItem({
    label: t_menu('open.thisTab'),
    click() {
      win.currentTab.webContents.loadURL(bookmark.url)
    }
  })

  addItem(SEPARATOR)

  addItem({
    label: t_bar('edit'),
    click() {
      openUniqueNereidTab(win, 'bookmarks', true, `#@bookmarkBar/edit:${index}`)
    }
  })
  addItem({
    label: t_bar('delete'),
    async click() {
      const bms = await bookmarks.get();
      bms["@bookmarkBar"].splice(index, 1);
      bookmarks.set(bms)
    }
  })

  addItem(SEPARATOR)

  addItem({
    label: t('common.bookmarks'),
    click() {
      openUniqueNereidTab(win, 'bookmarks', true)
    }
  })

  menu.popup();
}

export function menuOfProcess(process: Electron.ProcessMetric) {
  let menu = new Menu();
  function addItem(options: Electron.MenuItemConstructorOptions) {
    menu.append(new MenuItem(options))
  }

  function $t(str: string, obj?: {}) {
    return t(`windows.taskManager.${str}`, obj)
  }

  let localizedIntegrity = $t('table.integrityDescription.unknown');
  if (process.integrityLevel) {
    localizedIntegrity = $t(`table.integrityDescription.${process.integrityLevel}`)
  }

  addItem({ label: $t('button-finish'), async click() {
    try {
      await kill(process.pid)

    } catch (error) {
      dialog.showErrorBox('Failed to terminate the process', `Error: ${error}`)
    }
  } })
  addItem(SEPARATOR)
  addItem({ enabled: false, label: $t('table.more-integrity', { value: localizedIntegrity }) })
  addItem({ enabled: false, label: $t('table.more-peakMemory', { value: process.memory.peakWorkingSetSize + ' ' + $t('table.kb') }) })
  addItem({ enabled: false, label: $t('table.more-creationTime', { value: (new Date(process.creationTime)).toISOString() }) })
  addItem({ enabled: false, label: process.sandboxed ? $t('table.more-sandboxed') : $t('table.more-notSandboxed') })

  menu.popup()
}

export function menuOfPaneDivider(win: TabWindow) {
  let menu = new Menu();

  if (!win.currentPaneView) {
    return dialog.showErrorBox("Error", "No panes opened")
  }

  menu.append(commands.closePanes.toMenuItem(clickToTrigger))
  menu.append(commands.swapPanes.toMenuItem(clickToTrigger))

  menu.popup()
}